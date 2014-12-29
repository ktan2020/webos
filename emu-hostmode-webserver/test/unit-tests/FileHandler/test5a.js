
include("prototype_triton.js");
include("FileHandler.js");

function main() {
 
    var handler = new FileHandler();
    
    var files = handler._getDirListing('.');
    console.log("dir: .");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('..');
    console.log("dir: ..");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('./..');
    console.log("dir: ./..");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('../..');
    console.log("dir: ../..");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('/temp');
    console.log("dir: /temp");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('/tmp');
    console.log("dir: /tmp");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('/tmp/');
    console.log("dir: /tmp/");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('/Users');
    console.log("dir: /Users");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('/');
    console.log("dir: /");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    files = handler._getDirListing('~');
    console.log("dir: ~");
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
    // empty dir
    files = handler._getDirListing('/Users/kenjitan/Desktop/projects/temp/test/t');
    console.log('/Users/kenjitan/Desktop/projects/temp/test/t');
    console.log("length: " + files.length);
    console.log("files: " + Object.toJSON(files));
    
}
