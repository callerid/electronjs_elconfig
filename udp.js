const dgram = require('dgram');

var server3520 = dgram.createSocket('udp4');
var server6699 = dgram.createSocket('udp4');

const HOST = '0.0.0.0';
var bound3520 = false;
var bound6699 = false;

server3520.on('error', function(error){

    console.log('3520 failed to bind.');

});

server6699.on('error', function(error){

    console.log('6699 failed to bind.');

});

server3520.on('listening', function() {

    bound3520 = true;
    var address = server3520.address();
    console.log('UDP Server listening on ' + address.address + ':' + address.port);

});

server6699.on('listening', function() {

    bound6699 = true;
    var address = server6699.address();
    console.log('UDP Server listening on ' + address.address + ':' + address.port);

});

server3520.on('message', function(message, remote) {

    console.log(remote.address + ':' + remote.port + ' - ' + message);

});

server6699.on('message', function(message, remote) {

    console.log(remote.address + ':' + remote.port + ' - ' + message);

});

// Auto bind at start
bind();

function bind()
{
    server3520.bind(3520, HOST);
    server6699.bind(6699, HOST);
}

function send_udp_string(to_send_str, port, ip)
{
    // Send via UDP port
    server3520.send(Buffer.from(to_send_str), port, ip); 

}

function send_udp_string_and_bytes(to_send_str, to_send_bytes, ip)
{
    // Send via UDP port
    server3520.send(to_send_bytes + Buffer.from(to_send_str), port, ip);
}

function get_bound_status(port)
{
    if(port == 6699)
    {
        return bound6699;
    }
    else
    {
        return bound3520;
    }
}