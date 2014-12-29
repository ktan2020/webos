

var HttpUtils = {};


HttpUtils.CRLF = "\r\n";


/**
 * Standard HTTP return codes
 */
HttpUtils.HttpStatus = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    307: 'Temporary Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Request Entity Too Large',
    414: 'Request-URI Too Large',
    415: 'Unsupported Media Type',
    416: 'Request Range Not Satisfiable',
    417: 'Expectation Failed',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
};


/**
 * Some default Mime Types
 */
HttpUtils.DefaultMimeTypes = {
      "ai"    : "application/postscript",
      "asc"   : "text/plain",
      "avi"   : "video/x-msvideo",
      "bin"   : "application/octet-stream",
      "bmp"   : "image/bmp",
      "class" : "application/octet-stream",
      "cer"   : "application/pkix-cert",
      "crl"   : "application/pkix-crl",
      "crt"   : "application/x-x509-ca-cert",
      "crl"   : "application/x-pkcs7-crl",
      "css"   : "text/css",
      "dms"   : "application/octet-stream",
      "doc"   : "application/msword",
      "dvi"   : "application/x-dvi",
      "eps"   : "application/postscript",
      "etx"   : "text/x-setext",
      "exe"   : "application/octet-stream",
      "gif"   : "image/gif",
      "htm"   : "text/html",
      "html"  : "text/html",
      "jpe"   : "image/jpeg",
      "jpeg"  : "image/jpeg",
      "jpg"   : "image/jpeg",
      "lha"   : "application/octet-stream",
      "lzh"   : "application/octet-stream",
      "mov"   : "video/quicktime",
      "mpe"   : "video/mpeg",
      "mpeg"  : "video/mpeg",
      "mpg"   : "video/mpeg",
      "pbm"   : "image/x-portable-bitmap",
      "pdf"   : "application/pdf",
      "pgm"   : "image/x-portable-graymap",
      "png"   : "image/png",
      "pnm"   : "image/x-portable-anymap",
      "ppm"   : "image/x-portable-pixmap",
      "ppt"   : "application/vnd.ms-powerpoint",
      "ps"    : "application/postscript",
      "qt"    : "video/quicktime",
      "ras"   : "image/x-cmu-raster",
      "rb"    : "text/plain",
      "rd"    : "text/plain",
      "rtf"   : "application/rtf",
      "sgm"   : "text/sgml",
      "sgml"  : "text/sgml",
      "tif"   : "image/tiff",
      "tiff"  : "image/tiff",
      "txt"   : "text/plain",
      "xbm"   : "image/x-xbitmap",
      "xls"   : "application/vnd.ms-excel",
      "xml"   : "text/xml",
      "xpm"   : "image/x-xpixmap",
      "xwd"   : "image/x-xwindowdump",
      "zip"   : "application/zip",
};


HttpUtils.normalizePath = function(path) {
    
};


HttpUtils.parseQvalues = function(str) {
    
};


