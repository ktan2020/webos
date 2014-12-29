/*
 * Test with netcat or the sample client
 * $ nc 127.0.0.1 8080
 *
 */

function main() {
	var family = Triton.Socket.PF_INET;
	var sockType = Triton.Socket.SOCK_STREAM;
	var port = "8080";
	var addrs = Triton.Socket.getaddrinfo(null, port, family, sockType);
	var sa = undefined;

	for(var i = 0; i < addrs.length; i++) {
		var addr = addrs[i];
		console.log("addrinfo:", JSON.stringify(addr));
		sa = new Triton.Socket.SockAddr(
			addr.family, addr.sockAddr.host, addr.sockAddr.port);
		break;
	}

	if (!sa) {
		console.log("Failed to find sockaddress, quitting.");
		quit();
	}

	console.log("Making new socket.");
	var serverSocket = new Triton.Socket.Socket(family, sockType);
	serverSocket.setsockopt(Triton.Socket.SOL_SOCKET, Triton.Socket.SO_REUSEADDR, true);

	function serverReadReady() {
		console.log("Server read ready, accepting a connection");
		var acceptedConnection = serverSocket.accept();
		console.log("Accepted a new connection:",
					JSON.stringify(acceptedConnection));
		var clientSocket = acceptedConnection.socket;
		var clientChannel = new Triton.IOChannel.Channel(clientSocket);
		clientChannel.flags |= Triton.IOChannel.FLAG_NONBLOCK;

		var said; 
		
		// <!------
		
		function clientReadReady() {
			console.log("Client read ready!");
			try {
			    if (clientChannel.flags & Triton.IOChannel.FLAG_IS_READABLE) {
			        said = clientChannel.read(1024);
                
                    if (!said) {
                        console.log("Remote side closed client connection.");
                        clientSocket.close();
                        clientChannel.shutdown(true);
                        clientChannel.onread = undefined; 
                        clientChannel.onwrite = undefined;
                        return;
                    } else {
                        console.log("Client said: " + said);
                        clientChannel.onread = tr;
                    }
                }
			} catch (err) {
			    console.log("clientReadReady threw an Exception: " + err);
			    clientChannel.onread = undefined;
			    clientChannel.onwrite = undefined;
			}
		}
		
		function clientWriteReady() {
		    if (said) {
		        console.log("Client write ready!");
		        
		        try {
                    if (clientChannel.flags & Triton.IOChannel.FLAG_IS_WRITEABLE) {
                        clientChannel.write(said);
                        clientChannel.flush();
                        said = undefined;
                        console.log("finished writing!");
                    }
		        } catch (err) {
		            clientChannel.onread = undefined;
		            clientChannle.onwrite = undefined;
		            said = undefined;
		        }
		    }
		}
	
		var id;
		function tr() {
		   clientChannel.onread = undefined;
		    
		    if (id) { 
		        console.log("clearing timeout");
		        clearTimeout(id);
		        id = undefined;
		        clientChannel.onread = tr;
		    } else {		    
                console.log("Setting timeout");
                id = setTimeout(clientReadReady, 10);
		    }
		}
	
		// ------!>

		clientChannel.onread = tr;
		clientChannel.onwrite = clientWriteReady;
	}

	var serverChannel = new Triton.IOChannel.Channel(serverSocket);
	serverChannel.flags |= Triton.IOChannel.FLAG_NONBLOCK;
	serverChannel.onread = serverReadReady;
	console.log("Binding new socket to address", JSON.stringify(sa));
	console.log("Listening on server socket");
	serverSocket.bind(sa).listen(5);
	startApplicationLoop();
}



