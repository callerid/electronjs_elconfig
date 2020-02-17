const dgram = require('dgram');

var server = dgram.createSocket('udp4');
const PORT = 3520;
const HOST = '127.0.0.1';

server.on('listening', function() {

    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ':' + address.port);

});

server.on('message', function(message, remote) {

    console.log(remote.address + ':' + remote.port + ' - ' + message);

});

server.bind(PORT, HOST);

function send_udp_string(to_send_str, port)
{
    // Send via UDP port

}

function send_udp_string_and_bytes(to_send_str, to_send_bytes, port)
{
    // Send via UDP port
}