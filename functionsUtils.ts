export const getJustOneName = (value) => {
  let rta = ""
  for (let index = 0; index < value.length; index++) {
    const element = value[index];
    // console.log(element)
      if(element === " "){
        return rta
      }else {
        rta = rta.concat('', element)
        // console.log('rta', rta)
      }
  }
}
