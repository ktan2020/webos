
include("prototype_triton.js");
include("PalmServiceHandler.js");

function main() {
    var handler = new PalmServiceHandler();
    
    var h = $H({'query':{'serviceName':'testService','serviceMethod':'testMethod','methodParams':'some string to pass by json'},
                'uri':'/bridge/connect/'});
    
    handler.doGET($H(), h);
}
