/* Patch the PDFJS.getDocument function to use the proxy to bypass CORS. */
var _getDocument = PDFJS.getDocument;
PDFJS.getDocument = function getDocumentWithProxy(src) {
  var argsRest = Array.prototype.slice.call(arguments, 1);
  var args = [src].concat(argsRest);
  src.url = '/id_/' + src.url;
  return _getDocument.apply(PDFJS, args);
}
