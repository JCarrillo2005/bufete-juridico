import { useEffect, useState } from 'react'

export default function useDebounce(valor, espera = 350) {
  const [valorDiferido, setValorDiferido] = useState(valor)

  useEffect(() => {
    const temporizador = setTimeout(() => setValorDiferido(valor), espera)
    return () => clearTimeout(temporizador)
  }, [valor, espera])

  return valorDiferido
}
