
include("prototype_triton.js");
include("FileHandler.js");

function main() {
    
    var handler = new FileHandler();
    
    // non existent dir
    console.log('/temp/ :' + handler._parent('/temp/'));
    console.log('/temp :' + handler._parent('/temp'));
    
    console.log('temp :' + handler._parent('temp'));
    console.log('temp/ :' + handler._parent('temp/'));
    
    // dir
    console.log('/ :' + handler._parent('/'));
    console.log('/tmp/ :' + handler._parent('/tmp/'));
    console.log('/tmp :' + handler._parent('/tmp'));
    
    // null
    console.log('null: ' + handler._parent(null));
    
    // empty dir
    console.log('/Users/kenjitan/Desktop/projects/temp/test/t: ' + handler._parent('/Users/kenjitan/Desktop/projects/temp/test/t'));
    console.log('/Users/kenjitan/Desktop/projects/temp/test/t/: ' + handler._parent('/Users/kenjitan/Desktop/projects/temp/test/t/'));
    
}
