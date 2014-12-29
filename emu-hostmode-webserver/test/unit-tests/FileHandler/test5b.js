
include("prototype_triton.js");
include("FileHandler.js");

function main() {
    
    var handler = new FileHandler();
    
    // non existant dir
    console.log('/temp/ :' + handler._isPathDir('/temp/'));
    console.log('/temp :' + handler._isPathDir('/temp'));
    
    // valid dirs
    console.log('/tmp/ :' + handler._isPathDir('/tmp/'));
    console.log('/tmp :' + handler._isPathDir('/tmp/'));
    
    console.log('. :' + handler._isPathDir('.'));
    console.log('.. :' + handler._isPathDir('..'));
    
    console.log('./.. :' + handler._isPathDir('./..')); // XXX
    console.log('../.. :' + handler._isPathDir('../..')); // XXX
    
    console.log('/ :' + handler._isPathDir('/'));
    console.log('~ :' + handler._isPathDir('~'));
    
    // empty dir
    console.log('/Users/kenjitan/Desktop/projects/temp/test/t: ' + handler._isPathDir('/Users/kenjitan/Desktop/projects/temp/test/t'));
    console.log('/Users/kenjitan/Desktop/projects/temp/test/t/: ' + handler._isPathDir('/Users/kenjitan/Desktop/projects/temp/test/t/'));
    
    // valid file with no extension
    console.log('/Users/kenjitan/Desktop/projects/temp/test/makefile: ' + handler._isPathDir('/Users/kenjitan/Desktop/projects/temp/test/makefile'));
    
}
