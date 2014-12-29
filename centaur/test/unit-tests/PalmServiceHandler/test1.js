
include("prototype_triton.js");
include("PalmServiceHandler.js");

function main() {
    var handler = new PalmServiceHandler();
     
    // response's query object must be of object type (js hash) 
    handler.doGET($H(), $H({'query':{'serviceName':'testService','serviceMethod':'testMethod','methodParams':'some string to pass by json'}}));
}
