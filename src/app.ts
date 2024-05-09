import { join } from 'path';
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot';
import { MemoryDB as Database } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { db } from 'firebase.config';
import axios from 'axios';
import { getJustOneName } from '../functionsUtils';
// import fs from 'fs/promises';
import chromium from '@sparticuz/chromium'
import cron from 'node-cron'
import fsPromises from "node:fs/promises";
import puppeteer from 'puppeteer';
import { dateConvertObject, dateConvertObjectSuscription } from 'date';
import dotenv from 'dotenv'
dotenv.config()

const PORT = process.env.PORT ?? 3000

const flujoEnviaPdf = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAnswer('tu producto ha sido entregado', null, async (_, { state, flowDynamic }) => {
    console.log('segundo')
    await flowDynamic([{
      body: `Look at this`,
      media: join(`${state.get('dniUsuario')}.pdf`)
    }])
    // if(state.get('dniUsuario').length === 8){
    console.log(`archivo ha sido borrado`, 'state.get(dniUsuario)', state.get('dniUsuario'));
    await fsPromises.unlink(`${state.get('dniUsuario')}.pdf`);

    // }
  })

const flujoPagoVerificacion = addKeyword(['verificacion', 'verificar'])
  .addAnswer('escribe el numero de *DNI* con el que se realizo el pago del yape para la verificación', { capture: true }, async (ctx, { fallBack, gotoFlow, flowDynamic, state }) => {
    await state.update({ estadoDeVerificacion: true })
    let dniDePagoDeYape
    let nomComPagoYape
    let nomComPagoPlin
    let lastnameYape
    let firstname
    const dni = ctx.body
    const regex = /^[0-9]*$/;
    const onlyNumbers = regex.test(dni)

    if (dni.length === 8 && onlyNumbers) {

      await flowDynamic('Estamos verificando tus datos, te responderemos en un minuto ⏱️......')
      try {
        axios
          .get(`https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${process.env.API_RUC_TOKEN}`)
          .then(response => {
            dniDePagoDeYape = response
          })
          .then(async r => {
            if (dniDePagoDeYape) {
              nomComPagoYape = `${dniDePagoDeYape.data.nombres} ${dniDePagoDeYape.data.apellidoPaterno} ${dniDePagoDeYape.data.apellidoMaterno}`
              nomComPagoPlin = getJustOneName(dniDePagoDeYape.data.nombres)
              lastnameYape = dniDePagoDeYape.data.apellidoPaterno
              firstname = dniDePagoDeYape.data.apellidoMaterno
            }
          })

      } catch (error) {
        console.log('error:', error)
      }

      try {
        axios
          .post(`${process.env.URL_API_DOCUMENT_EXCEL}`,
            {
              op: "listar"
            }
          )
          .then(async response => {
            const listaDeYapes = await response?.data.content
            console.log('listaDeYapes', listaDeYapes)
            if (listaDeYapes?.length > 5) {
              try {
                listaDeYapes?.map(async yape => {
                  const nombre = yape.mensaje.slice(6, -26)
                  console.log('nombre?.toLowerCase()',nombre?.toLowerCase())
                  console.log('nomComPagoYape?.toLowerCase()',nomComPagoYape?.toLowerCase())
                  if (nombre?.toLowerCase() === nomComPagoYape?.toLowerCase()) {
                    await state.update({ estadoDeVerificacion: false })
                    const subscriptionRef = db.collection("customers").doc(`${state.get('dniUsuario')}`)
                    subscriptionRef.get().then(async user => {
                      if (user.exists) {
                        subscriptionRef.update({
                          subscription: true,
                          dateSubscription: new Date(),
                          // timesSubscripted: db.firestore.FieldValue.increment(1)
                          returningCustomer: true
                          // timesSubscripted: firebase.firestore.FieldValue.increment(1)
                        })
                        const browserTest = await puppeteer.launch({
                          headless: true,
                          // executablePath: '/path/to/Chrome',
                          // defaultViewport: chromium.defaultViewport,
                          args: [
                            "--disabled-setuid-sandbox",
                            "--no-sandbox",
                            "--single-process",
                            "--no-zygote"
                          ],
                          // executablePath: "/usr/bin/google-chrome-stable",
                          executablePath: "/usr/bin/chromium-browser",
                          
                          // executablePath: puppeteer.executablePath(),
                          // ignoreHTTPSErrors: true,
                          // slowMo:3000
                        })
                        const pageTest = await browserTest.newPage()
                        await pageTest.goto(`${process.env.URL_PAGE_MANAGE}/customers/${state.getMyState().dniUsuario}`, {
                          waitUntil: 'networkidle2',
                        })

                        await pageTest.setViewport({ width: 1366, height: 768 });

                        // Get the height of the page after navigating to it.
                        // This strategy to calculate height doesn't work always though. 
                        const bodyHandle = await pageTest.$('body');
                        const { height } = await bodyHandle.boundingBox();
                        await bodyHandle.dispose();

                        const calculatedVh = pageTest.viewport().height;
                        let vhIncrease = 0;
                        while (vhIncrease + calculatedVh < height) {
                          // Here we pass the calculated viewport height to the context
                          // of the page and we scroll by that amount
                          await pageTest.evaluate(_calculatedVh => {
                            window.scrollBy(0, _calculatedVh);
                          }, calculatedVh);
                          // await pageTest.waitFor(300);
                          vhIncrease = vhIncrease + calculatedVh;
                        }

                        // Setting the viewport to the full height might reveal extra elements
                        await pageTest.setViewport({ width: 1366, height: calculatedVh });

                        // Scroll back to the top of the page by using evaluate again.
                        await pageTest.evaluate(() => {
                          window.scrollTo(0, 0);
                        });

                        await pageTest.pdf({
                          path: `${state.get('dniUsuario')}.pdf`,
                          format: 'A4'
                        });
                        await browserTest.close()
                          .then(r => {
                            console.log('primero')
                            return gotoFlow(flujoEnviaPdf)
                          })
                      }
                    })
                  }
                })
              } catch (error) {
                console.log(error)
                return fallBack('Algo paso en el camino, porfavor intenta nuevamente')
              }
            }
          })
          .then(async r => {
            if (state.get('estadoDeVerificacion')) await flowDynamic('Upps!, parece que hubo algun problema con la verificacion del pago, intenta nuevamente, escribe *VERIFICAR*')
          })
      } catch (error) {
        console.log('error', error)
      }

    }
  })

const flujoPago = addKeyword('si')
  .addAnswer(['Realiza el pago de *yape* de *S/5.00* para suscribirte.', '*Numero*: 982752688', '*Titular*:FRANCO ERNESTO CONDORI HUARAYA', 'Para verificar el pago ecribe *VERIFICAR*']
  )

const flujoInteresadoYacliente = addKeyword('si')
  .addAnswer(['Quieres renovar tu suscripción?, escribe *SI* para continuar.'], null, null, flujoPago)

const flujoInteresado = addKeyword('si')
  .addAnswer(['Estas interesado en nuestro producto?, escribe *SI* para continuar.'], null, null, flujoPago)

const flujoBienvenida = addKeyword("titi")
  .addAnswer('cual es tu numero de *DNI*?', { capture: true },
    async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
      let rta
      const dni = ctx.body
      const regex = /^[0-9]*$/;
      const onlyNumbers = regex.test(dni)
      if (dni.length === 8 && onlyNumbers) {
        const docRef = db.collection("customers").doc(`${dni}`);

        docRef.get().then(async (doc) => {
          if (doc.exists) {
            docRef.update({ numberMobile: ctx.from.slice(2) })
            await state.update({ dniUsuario: dni })
            await flowDynamic(`Hola *${doc.data().name.toUpperCase()} ${doc.data().lastname.toUpperCase()} ${doc.data().firstname.toUpperCase()}*, un gusto saludarte de nuevo!`)
            return gotoFlow(flujoInteresadoYacliente)
          } else {
            try {
              axios
                .get(`https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${process.env.API_RUC_TOKEN}`)
                .then(response => {
                  rta = response
                  console.log('rta', rta)
                })
                .then(async r => {
                  if (rta.data.success) {
                    db.collection("customers").doc(`${dni}`).set({
                      name: rta.data.nombres.toLowerCase(),
                      lastname: rta.data.apellidoPaterno.toLowerCase(),
                      firstname: rta.data.apellidoMaterno.toLowerCase(),
                      numberMobile: ctx.from.slice(2),
                      subscription: false,
                      dateOfSubscription: new Date()
                    });
                    await state.update({ dataUser: rta })
                    await state.update({ dniUsuario: dni })
                    await state.update({ nombreCompleto: `${rta.data.nombres} ${rta.data.apellidoPaterno} ${rta.data.apellidoMaterno}` })
                    await state.update({ nombre: getJustOneName(rta.data.nombres) })
                    await state.update({ apellidoPaterno: rta.data.apellidoPaterno })
                    await state.update({ apellidoPaterno: rta.data.apellidoMaterno })
                  } else {
                    return fallBack('Porfavor escribe un *DNI* valido')
                    // return fallBack()
                  }
                })
                .then(async r => {
                  if (rta.data.success) {
                    await flowDynamic(`Hola *${state.get('nombreCompleto')}*`)
                    return gotoFlow(flujoInteresado)
                  } else {
                    return
                  }
                })
            } catch (err) {
              console.log("Error getting document:", err);
            }

          }
        }).catch((error) => {
          console.log("Error getting document:", error);
        });

      } else {
        await flowDynamic('Ingresa un dni valido')
        return fallBack()
      }

    })

const flujoTips = addKeyword('tips')
  .addAnswer('Porfavor envianos tu numero de *DNI* para validar tus datos', { capture: true }, async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
    const dni = ctx.body
    let dataUser
    const number = ctx.from.slice(2)
    const regex = /^[0-9]*$/;
    const onlyNumbers = regex.test(dni)
    if (dni.length === 8 && onlyNumbers) {
      const docRef = db.collection("customers").doc(`${dni}`);
      // const subscriptionRef = db.collection("customers");
      // subscriptionRef.where("numberMobile", "==", number)
      docRef.get().then(async (doc) => {
        if (doc.exists) {
          dataUser = { ...doc.data(), id: doc.id }
          if (dataUser?.id) {
            const browserTest = await puppeteer.launch({
              headless: true,
              // slowMo:3000
            })
            const pageTest = await browserTest.newPage()
            await pageTest.goto(`${process.env.URL_PAGE_MANAGE}/customers/${dataUser.id}`, {
              waitUntil: 'networkidle2',
            })

            await pageTest.setViewport({ width: 1366, height: 768 });

            // Get the height of the page after navigating to it.
            // This strategy to calculate height doesn't work always though. 
            const bodyHandle = await pageTest.$('body');
            const { height } = await bodyHandle.boundingBox();
            await bodyHandle.dispose();

            const calculatedVh = pageTest.viewport().height;
            let vhIncrease = 0;
            while (vhIncrease + calculatedVh < height) {
              // Here we pass the calculated viewport height to the context
              // of the page and we scroll by that amount
              await pageTest.evaluate(_calculatedVh => {
                window.scrollBy(0, _calculatedVh);
              }, calculatedVh);
              // await pageTest.waitFor(300);
              vhIncrease = vhIncrease + calculatedVh;
            }

            // Setting the viewport to the full height might reveal extra elements
            await pageTest.setViewport({ width: 1366, height: calculatedVh });

            // Scroll back to the top of the page by using evaluate again.
            await pageTest.evaluate(() => {
              window.scrollTo(0, 0);
            });

            await pageTest.pdf({
              path: `${dataUser.id}.pdf`,
              format: 'A4'
            });
            await browserTest.close()
              .then(async r => {
                console.log('primero')
                await state.update({ dniUsuario: `${dataUser.id}` })
                return gotoFlow(flujoEnviaPdf)
              })
          }

        } else {
          console.log("No such document!");
        }
      }).catch((error) => {
        console.log("Error getting document:", error);
      });

      // docRef.get()
      //   .then(async (querySnapshot) => {
      //     querySnapshot.forEach((doc) => {
      //       // customersActiveSubscription.push({ ...doc.data(), id: doc.id })
      //       dataUser = { ...doc.data(), id: doc.id }
      //       // console.log('dataUser', dataUser)
      //     });

      //     if (dataUser?.id) {
      //       const browserTest = await puppeteer.launch({
      //         headless: true,
      //         // slowMo:3000
      //       })
      //       const pageTest = await browserTest.newPage()
      //       await pageTest.goto(`${process.env.URL_PAGE_MANAGE}/customers/${dataUser.id}`, {
      //         waitUntil: 'networkidle2',
      //       })

      //       await pageTest.setViewport({ width: 1366, height: 768 });

      //       // Get the height of the page after navigating to it.
      //       // This strategy to calculate height doesn't work always though. 
      //       const bodyHandle = await pageTest.$('body');
      //       const { height } = await bodyHandle.boundingBox();
      //       await bodyHandle.dispose();

      //       const calculatedVh = pageTest.viewport().height;
      //       let vhIncrease = 0;
      //       while (vhIncrease + calculatedVh < height) {
      //         // Here we pass the calculated viewport height to the context
      //         // of the page and we scroll by that amount
      //         await pageTest.evaluate(_calculatedVh => {
      //           window.scrollBy(0, _calculatedVh);
      //         }, calculatedVh);
      //         // await pageTest.waitFor(300);
      //         vhIncrease = vhIncrease + calculatedVh;
      //       }

      //       // Setting the viewport to the full height might reveal extra elements
      //       await pageTest.setViewport({ width: 1366, height: calculatedVh });

      //       // Scroll back to the top of the page by using evaluate again.
      //       await pageTest.evaluate(() => {
      //         window.scrollTo(0, 0);
      //       });

      //       await pageTest.pdf({
      //         path: `${dataUser.id}.pdf`,
      //         format: 'A4'
      //       });
      //       await browserTest.close()
      //         .then(async r => {
      //           console.log('primero')
      //           await state.update({ dniUsuario: `${dataUser.id}` })
      //           return gotoFlow(flujoEnviaPdf)
      //         })
      //     }
      //   })

    }

  })
const main = async () => {
  const adapterFlow = createFlow([flujoPagoVerificacion, flujoBienvenida, flujoEnviaPdf, flujoTips])

  const adapterProvider = createProvider(Provider)
  const adapterDB = new Database()

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })


  // cron.schedule('*/1 * * * *', async () => {
  cron.schedule('* 1 * * *', async () => {
    console.log('hemos entrado')
    const customersActiveSubscription = []
    const customerSubscriptionActive = db.collection("customers");
    // Create a query against the collection.
    customerSubscriptionActive.where("subscription", "==", true)
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          customersActiveSubscription.push({ ...doc.data(), id: doc.id })
        });
      })
      .then(async r => {
        const currentlyDate = new Date()

        await Promise.all(customersActiveSubscription?.map(async user => {
          const data = new Date(user.dateSubscription._seconds * 1000)
          const date2 = new Date(user.dateSubscription._seconds * 1000)
          const rtaDate = dateConvertObject(new Date(data?.setDate(data?.getDate() + 15)))
          const rtaDateValidate = dateConvertObjectSuscription(new Date(date2?.setDate(date2?.getDate() + 30)))
          console.log('rtaDate', rtaDate)
          console.log('rtaDateValidate', rtaDateValidate)
          // console.log(`${user.id}`, rtaDate)
          if (currentlyDate && rtaDate) {
            if (rtaDate.date === currentlyDate.getDate() && rtaDate.month === currentlyDate.getMonth() && rtaDate.year === currentlyDate.getFullYear()) {
              await adapterProvider.sendMessage(`51${user.numberMobile}`,
                `Hola *${user.name.toUpperCase()} ${user.lastname.toUpperCase()} ${user.firstname.toUpperCase()}*, tienes nuevos tips pendientes por aprender, escribe *TIPS* para enviartelos. valido hasta ${rtaDateValidate.date} de ${rtaDateValidate.month} del ${rtaDateValidate.year}`, {})
              // await utils.delay(3000)
              const refUser = db.collection("customers").doc(`${user.id}`);
              return refUser.update({
                subscription: false
              })
                .then(() => {
                  console.log("Document successfully updated!");
                })
                .catch((error) => {
                  // The document probably doesn't exist.
                  console.error("Error updating document: ", error);
                });
            }
          }
        }))
      })

      .catch((error) => {
        console.log("Error getting documents: ", error);
      })
  });

  adapterProvider.server.post(
    '/v1/messages',
    handleCtx(async (bot, req, res) => {
      const { number, message, urlMedia } = req.body
      await bot.sendMessage(number, message, { media: urlMedia ?? null })
      return res.end('sended')
    })
  )

  adapterProvider.server.post(
    '/v1/register',
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body
      await bot.dispatch('REGISTER_FLOW', { from: number, name })
      return res.end('trigger')
    })
  )

  adapterProvider.server.post(
    '/v1/samples',
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body
      await bot.dispatch('SAMPLES', { from: number, name })
      return res.end('trigger')
    })
  )

  adapterProvider.server.post(
    '/v1/blacklist',
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body
      if (intent === 'remove') bot.blacklist.remove(number)
      if (intent === 'add') bot.blacklist.add(number)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ status: 'ok', number, intent }))
    })
  )

  httpServer(+PORT)
}

main()
