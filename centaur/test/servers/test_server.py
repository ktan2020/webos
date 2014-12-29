
import BaseHTTPServer
import SimpleHTTPServer

def run(server_class=BaseHTTPServer.HTTPServer,
        handler_class=SimpleHTTPServer.SimpleHTTPRequestHandler):
    server_address = ('', 8080)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

run()
