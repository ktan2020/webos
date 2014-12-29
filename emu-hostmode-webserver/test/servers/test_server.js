
/*
 * Test with netcat or the sample client
 * $ nc 127.0.0.1 50505
 *
 */

function main() {
	var family = webOS.Socket.AF_INET;
	var sockType = webOS.Socket.SOCK_STREAM;
	var port = "50505";
	var addrs = webOS.Socket.getaddrinfo(null, port, family, sockType);
	var sa = undefined;

	for (var i = 0; i < addrs.length; i++) {
		var addr = addrs[i];
		console.log("addrinfo:", JSON.stringify(addr));
		sa = new webOS.Socket.SockAddr(
			addr.family, addr.sockAddr.host, addr.sockAddr.port);
		break;
	}

	if (!sa) {
		console.log("Failed to find sockaddress, quitting.");
		quit();
	}

	console.log("Making new socket.");
	var socket = new webOS.Socket.Socket(family, sockType);

	console.log("Binding new socket to address", JSON.stringify(sa));
	socket.bind(sa).listen(5);

	while (true) {
		console.log("Accepting a connection");
		var accepted = socket.accept();
		console.log("Result:", JSON.stringify(accepted));

		var channel = new webOS.IOChannel.Channel(accepted.socket);
		var said = channel.read(1024);
		console.log("Client said: " + said);

		channel.write(said);
		channel.flush();
		accepted.socket.close();
	}

	console.log("Closing socket.");
	socket.close();
}


