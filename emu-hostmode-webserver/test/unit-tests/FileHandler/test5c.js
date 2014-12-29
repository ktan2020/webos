
include("prototype_triton.js");
include("FileHandler.js");

function main() {
    
    var handler = new FileHandler();
    
    // non existent dir
    console.log('/temp/ :' + handler._doesFileExist('/temp/'));
    console.log('/temp :' + handler._doesFileExist('/temp'));
    
    // dir
    console.log('/tmp/ :' + handler._doesFileExist('/tmp/'));
    console.log('/tmp :' + handler._doesFileExist('/tmp'));
    
    // actual files
    console.log('/mach_kernel :' + handler._doesFileExist('/mach_kernel'));
    console.log('~/temp/log.txt :' + handler._doesFileExist('~/temp/log.txt'));
    console.log('./readme.txt :' + handler._doesFileExist('./readme.txt'));
    console.log('./main.js :' + handler._doesFileExist('./main.js'));
    
    // phoney file
    console.log('/mach_kernel/ :' + handler._doesFileExist('/mach_kernel/'));
    console.log('nothing-here :' +handler._doesFileExist('nothing-here'));
    console.log('./test :' + handler._doesFileExist('./test'));
    
}
