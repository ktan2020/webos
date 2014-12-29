function main() {
	/*
	 * test with netcat or the sample server
	 * $ nc -l -p 5580
	 */

	var family = Triton.Socket.PF_INET;
	var sockType = Triton.Socket.SOCK_STREAM;
	var port = "5580";
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
	var socket = new Triton.Socket.Socket(family, sockType);

	console.log("Connecting");
	var channel = new Triton.IOChannel.Channel(socket.connect(sa));

	console.log("Writing message to server.");
	channel.write("Ping");

	// flushes from the channel object to the socket
	channel.flush();

	console.log("Reading message from server.");
	var serverSaid = channel.read(1024);
	console.log("Reply: " + serverSaid);

	console.log("Closing socket.");
	socket.close();

}


