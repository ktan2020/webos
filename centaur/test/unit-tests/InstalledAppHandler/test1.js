
include("prototype_triton.js");
include("InstalledAppHandler.js");

function main() {
    var handler = new InstalledAppHandler();
     
    console.log(Object.toJSON(handler._getDirs('/Users/kenjitan/Desktop/projects/temp')));
    console.log(Object.toJSON(handler._getDirs('/media/cryptofs/apps/usr/palm/applications/')));

}
