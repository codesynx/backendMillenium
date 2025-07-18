import { retrieveRawInitData } from '@telegram-apps/sdk'

const initDataRaw = retrieveRawInitData()

fetch('https://example.com/api', {
  method: 'POST',
  headers: {
    Authorization: `tma ${initDataRaw}`
  },
});