
include("prototype_triton.js");
include("FileHandler.js");

function main() {
    var f = new FileHandler($H(FileHandlerConfig));
    f.setOptions($H({'DOCUMENT_ROOT':'/','DIRECTORY_INDEX':'index.html'}));
    f.service($H({'Request-Line':'GET / HTTP/1.1'}), $H({}));
    f.service($H({'Request-Line':'GET /this/path/to/something.html?palmGetResource=true HTTP/1.1'}), $H({}));
}
