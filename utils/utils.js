// for node (client) and config (server)
const createBackwardCompatible = (obj) => {
  if (typeof obj.requestContentType === 'undefined') obj.requestContentType = obj.contentType
  if (typeof obj.responseContentType === 'undefined') obj.responseContentType = ''
  if (typeof obj.alternServer === 'undefined') obj.alternServer = false
  if (typeof obj.keepAuth === 'undefined') obj.keepAuth = false
  if (typeof obj.showDescription === 'undefined') obj.showDescription = true
  if (typeof obj.internalErrors === 'undefined') obj.internalErrors = {}
}

module.exports = {
  createBackwardCompatible
}
