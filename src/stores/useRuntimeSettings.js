import { ref } from 'vue'

const dataSaver = ref(localStorage.getItem('market-orca:data-saver') === '1')

export function setDataSaver(value) {
  dataSaver.value = !!value
  localStorage.setItem('market-orca:data-saver', value ? '1' : '0')
}

export function useRuntimeSettings() {
  return { dataSaver, setDataSaver }
}
