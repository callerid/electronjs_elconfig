const dgram = require('dgram');
const os = require('os');

var socket = dgram.createSocket('udp4');
var server3520 = dgram.createSocket('udp4');
var server6699 = dgram.createSocket('udp4');

const HOST = '0.0.0.0';
var bound3520 = false;
var bound6699 = false;

var connected_port = 0;
var found_unit = false;
var is_deluxe_unit = false;
var all_known_pc_ips = [];
var all_subnets = [];
var send_to_ip = '';
var ping_alternator = 0;

var processing_v_command = false;
var processing_x_command = false;

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

    // Comm command -------------------------------------------------
    check_for_v_command(message, remote);
    check_for_x_command(message, remote);
    //---------------------------------------------------------------

});

server6699.on('message', function(message, remote) {

    // Comm command -------------------------------------------------
    check_for_v_command(message, remote);
    check_for_x_command(message, remote);
    //---------------------------------------------------------------

});

function check_for_x_command(message, remote)
{
    if(message.length == 90 && !processing_x_command)
    {
        processing_x_command = true;

        // Update target unit location
        found_unit = true;

        if(send_to_ip != remote.address)
        {
            $("#lbSendingTo").text("Sending To: " + remote.address + ":" + remote.port);
        }

        send_to_ip = remote.address;
        connected_port = remote.port;

        console.log("X Command returned.");
    }
}

function check_for_v_command(message, remote)
{
    if(message.length == 57 && !processing_v_command)
    {
        processing_v_command = true;

        if(!is_deluxe_unit)
        {
            is_deluxe_unit = true;
            $("#lbDeluxeUnit").text("Deluxe Unit Detected");
        }

        console.log("V Command returned.");
    }
}

//-------------------------------------------------------------------
// Auto bind at start
bind();

// Get all PC addresses to use for subnet broadcasting/multicasting
get_pc_ips();

// Find Unit
find_unit();

function bind()
{
    server3520.bind(3520, HOST);
    server6699.bind(6699, HOST);
}

function find_unit()
{
    if(!found_unit)
    {
        all_subnets.forEach(function(ip){

            send_udp_string("^^IdX", 3520, ip);
            send_udp_string("^^IdX", 6699, ip);

        });

        // Continue till unit found
        setTimeout(find_unit, 1500);
    }
    else
    {
        // Auto start pinging X,V commands to unit
        send_pinging_commands();

        // Update UI to show connection
        $("#status_bar").removeClass("status_bar_disconnected");
        $("#status_bar").addClass("status_bar_connected");
        $("#imgConnected").removeClass("hidden");
        $("#lbStatus").text("Connected");
        console.log("Unit found on: " + connected_port + " at: " + send_to_ip);
    }
}

function send_pinging_commands()
{
    processing_v_command = false;
    processing_x_command = false;

    if(connected_port == 0 && !found_unit)
    {
        find_unit();
    }
    else
    {
        if(ping_alternator == 0) send_udp_string("^^IdX", connected_port, send_to_ip);
        if(ping_alternator == 1) send_udp_string("^^Id-V", connected_port, send_to_ip);
        
        ping_alternator++;
        if(ping_alternator > 1) ping_alternator = 0;

        // Reset timer
        setTimeout(send_pinging_commands, 1500);

    }    

}

function get_pc_ips()
{
    all_known_pc_ips = [];

    // Get PC IP and create subnet broadcast
    var ifaces = os.networkInterfaces();

    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(function (iface) {
            
            if ('IPv4' !== iface.family || iface.internal !== false) 
            {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            if (alias >= 1) {

                var single_ip = iface.address;
                all_known_pc_ips.push(single_ip);
            } 
            else 
            {
                var single_ip = iface.address;
                all_known_pc_ips.push(single_ip);
            }

            ++alias;

        });
    });

    all_subnets = [];

    all_known_pc_ips.forEach(function(ip){
        
        var subnet_address = convert_to_subnet_broadcast(ip);

        if(!all_subnets.includes(subnet_address)) all_subnets.push(subnet_address);

    });
}

function convert_to_subnet_broadcast(ip)
{
    var breakpoint = nth_pattern_occurance_in_string(ip, '.', 3);
    return ip.substr(0, breakpoint) + ".255";
}

function nth_pattern_occurance_in_string(str, pat, n){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
}

function send_udp_string(to_send_str, port, ip)
{
    // Send via UDP port
    console.log('Sending: ' + to_send_str + " on: " + port + " to: " + ip);
    socket.send(Buffer.from(to_send_str), port, ip, function(err){

        if(err != null) console.log("ERROR SENDING UDP: " + err.message);

    });

}

function send_udp_string_and_bytes(to_send_str, to_send_bytes, ip)
{
    // Send via UDP port
    socket.send(to_send_bytes + Buffer.from(to_send_str), port, ip);
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