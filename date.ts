const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"]
const monthNumber = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
const days = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]


export const hoursUnixDate = (date) => {
  const hourSeconds = new Date(Number(date?.toString().slice(18, 28)) * 1000)
  const seconds = date?.toString().slice(18, 28)
  const nanoseconds = date?.toString()
  // const nanoseconds = date?.toString().slice(42, 49)
  if (seconds?.length > 0 && Number(nanoseconds[0]) === 0) {
    return `${hourSeconds.getDate()} / ${hourSeconds.getMonth()} / ${hourSeconds.getFullYear()} ooo`
  } else {
    const rta = (Number(seconds) + Number(nanoseconds) / 1000000000) * 1000
    const hour = new Date(rta)
    return `${hour.getDate()} / ${hour.getMonth()} / ${hour.getFullYear()} ppp`
    // return `${hour.getHours().toString().padStart(2, "0")}:${hour.getMinutes().toString().padStart(2, "0")}:${hour.getSeconds().toString().padStart(2, "0")}${hour.getHours() < 12 ? "am" : "pm"}`
  }
}
export const dateConvertObject = (date) => {
  return {
    date: date.getDate(),
    // month: months[date.getMonth()],
    month: date.getMonth(),
    year: Number(date.getFullYear())
  }
}
export const dateConvertObjectSuscription = (date) => {
  console.log('date', date)
  return {
    date: date.getDate(),
    // month: months[date.getMonth()],
    month: months[date.getMonth()],
    year: Number(date.getFullYear())
  }
}