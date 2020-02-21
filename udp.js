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

var last_v_command_reception = "";
var getting_toggles_flag = false;

var last_call_record_reception = "";
var last_detailed_record_reception = "";

var last_x_command_reception = [];

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
    check_for_call_record(message);
    //---------------------------------------------------------------

});

server6699.on('message', function(message, remote) {

    // Comm command -------------------------------------------------
    check_for_v_command(message, remote);
    check_for_x_command(message, remote);
    check_for_call_record(message);
    //---------------------------------------------------------------

});

function check_for_call_record(message)
{
    // Detailed call record
    if(message.length == 52)
    {
        var message_str = array_to_ascii(message);
        message_str = message_str.substr(21, message_str.length - 21);

        // Reset duplicate filtering after max wait time
        setTimeout(function(){
            last_detailed_record_reception = "";
        }, 500);

        // Ignore dups (always - for detailed)
        if(last_detailed_record_reception == message_str)
        {
            return;
        }

        last_detailed_record_reception = message_str;

        var pattern = /.*(\d\d) ([NFR]) {13}(\d\d\/\d\d) (\d\d:\d\d:\d\d)/;
        var groups = pattern.exec(message_str);

        if(groups == null) return;

        var ln = groups[1];
        var type = groups[2];
        var date = groups[3];
        var time = groups[4];

        var num = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
        var name = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
        write_to_phone(ln, "&nbsp;", type, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;", "&nbsp;&nbsp;&nbsp;", "&nbsp;&nbsp;&nbsp;", date, time, num, name, false);

    }
    
    // Full call record
    if(message.length == 83)
    {
        // UDP is a call record
        var message_str = array_to_ascii(message);
        message_str = message_str.substr(21, message_str.length - 21);

        // Reset duplicate filtering after max wait time
        setTimeout(function(){
            last_call_record_reception = "";
        }, 1100);
        
        // Do not process duplicates
        if(document.getElementById('ckbIgnoreDups').checked)
        {
            if(last_call_record_reception == message_str)
            {
                return;
            }
        }
                
        last_call_record_reception = message_str;

        var pattern = /.*(\d\d) ([IO]) ([ESB]) (\d{4}) ([GB]) (.\d) (\d\d\/\d\d) (\d\d:\d\d [AP]M) (.{8,15})(.*)/;
        var groups = pattern.exec(message_str);

        if(groups == null) return;

        var ln = groups[1];
        var io = groups[2];
        var se = groups[3];
        var dur = groups[4];
        var cs = groups[5];
        var rings = groups[6];
        var date = groups[7];
        var time = groups[8];
        var num = groups[9].padEnd(14, "&nbsp;");
        var name = groups[10].padEnd(15, "&nbsp;");
        
        write_to_phone(ln, io, se, dur, cs, rings, date, time, num, name, false);

    }
}

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

        // Actual processing
        var message_str = array_to_ascii(message);
        var message_byte = message;

        // Ignore duplicate X commands, as nothing on box has changed
        if(last_x_command_reception == message_byte)
        {
            return;
        }

        // Update last reception
        last_x_command_reception = message_byte;

        // Parse all unit settings
        var unit_number = "";
        for(var i = 4; i < 10; i++)
        {
            unit_number += message_byte[i].toString();
        }
        $("#tbUnitNumber").val(unit_number);
        
        var unit_ip = "";
        for(var i = 33; i < 37; i++)
        {
            unit_ip += message_byte[i].toString() + ".";
        }
        unit_ip = unit_ip.substr(0, unit_ip.length - 1);
        $("#tbUnitIP").val(unit_ip);

        var unit_mac = "";
        for(var i = 24; i < 30; i++)
        {
            unit_mac += message_byte[i].toString(16).padStart(2, '0') + ":";
        }
        unit_mac = unit_mac.substr(0, unit_mac.length - 1);
        $("#tbUnitMAC").val(unit_mac);

        var dest_port = "";
        for (var i = 52; i <= 53; i++)
        {
            var int_value = message_byte[i];
            var hex_value = int_value.toString(16).padStart(2, '0');
            dest_port += hex_value;
        }
        dest_port = parseInt(dest_port, 16);
        $("#tbDestPort").val(dest_port);

        var dest_ip = "";
        for(var i = 40; i < 44; i++)
        {
            dest_ip += message_byte[i].toString() + ".";
        }
        dest_ip = dest_ip.substr(0, dest_ip.length - 1);
        $("#tbDestIP").val(dest_ip);

        var dest_mac = "";
        for(var i = 66; i < 72; i++)
        {
            dest_mac += message_byte[i].toString(16).toUpperCase().padStart(2, '0') + ":";
        }
        dest_mac = dest_mac.substr(0, dest_mac.length - 1);
        $("#tbDestMAC").val(dest_mac);

        var dups = "";
        

        console.log(message_byte);

        console.log("X Command returned.");
    }
}

function check_for_v_command(message, remote)
{
    if(message.length == 57 && !processing_v_command)
    {
        var message_str = array_to_ascii(message);

        // Do not process duplicates
        var chars_to_remove = 9;
        var start_index = message_str.indexOf("$") + 1;
        var this_v_command_reception = message_str.substr(start_index, message_str.length - start_index - chars_to_remove);
        
        if(last_v_command_reception == this_v_command_reception && !getting_toggles_flag)
        {
            // Is duplicate V command, do not process
            return;
        }
        else
        {
            last_v_command_reception = this_v_command_reception;
        }

        // Start processing
        processing_v_command = true;
        getting_toggles_flag = false;

        if(!is_deluxe_unit)
        {
            is_deluxe_unit = true;
            $("#lbDeluxeUnit").text("Deluxe Unit Detected");
        }

        // Write to COMM data
        write_to_comm(message_str.substr(start_index), false);

        // Check toggles
        var toggle_start = message_str.toUpperCase().indexOf('E');
        var t_chars_to_remove = 20;
        var toggles = message_str.substr(toggle_start, message_str.length - toggle_start - t_chars_to_remove);
        
        // Update toggles EcXudASoBKT
        var t_c = toggles[1];
        var t_u = toggles[3];
        var t_d = toggles[4];
        var t_a = toggles[5];
        var t_s = toggles[6];
        var t_o = toggles[7];
        var t_b = toggles[8];
        var t_k = toggles[9];

        
        // -- Update toggle text
        $("#btnToggleC").val(t_c);
        $("#btnToggleU").val(t_u);
        $("#btnToggleD").val(t_d);
        $("#btnToggleA").val(t_a);
        $("#btnToggleS").val(t_s);
        $("#btnToggleO").val(t_o);
        $("#btnToggleB").val(t_b);
        $("#btnToggleK").val(t_k);
        
        // -- Update toggle color ---------------
        if(t_c == t_c.toLowerCase())
        {
            $("#btnToggleC").addClass("toggle_on");
        }
        else
        {
            $("#btnToggleC").removeClass("toggle_on");
        }

        if(t_u == t_u.toLowerCase())
        {
            $("#btnToggleU").addClass("toggle_on");
        }
        else
        {
            $("#btnToggleU").removeClass("toggle_on");
        }

        if(t_d == t_d.toLowerCase())
        {
            $("#btnToggleD").addClass("toggle_on");
        }
        else
        {
            $("#btnToggleD").removeClass("toggle_on");
        }

        if(t_a == t_a.toLowerCase())
        {
            $("#btnToggleA").addClass("toggle_on");
        }
        else
        {
            $("#btnToggleA").removeClass("toggle_on");
        }

        if(t_s == t_s.toLowerCase())
        {
            $("#btnToggleS").addClass("toggle_on");
        }
        else
        {
            $("#btnToggleS").removeClass("toggle_on");
        }

        if(t_o == t_o.toLowerCase())
        {
            $("#btnToggleO").addClass("toggle_on");
        }
        else
        {
            $("#btnToggleO").removeClass("toggle_on");
        }

        if(t_b == t_b.toLowerCase())
        {
            $("#btnToggleB").addClass("toggle_on");
        }
        else
        {
            $("#btnToggleB").removeClass("toggle_on");
        }

        if(t_k == t_k.toLowerCase())
        {
            $("#btnToggleK").addClass("toggle_on");
        }
        else
        {
            $("#btnToggleK").removeClass("toggle_on");
        }

        // --------------------------------------
        
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

// -----------------------------------------------------------
//                       Low-level/Misc commands
// -----------------------------------------------------------
function set_toggle(button_text)
{
    if(button_text == button_text.toUpperCase())
    {
        send_udp_string("^^Id-" + button_text.toLowerCase(), connected_port, send_to_ip);
    }
    else
    {
        send_udp_string("^^Id-" + button_text.toUpperCase(), connected_port, send_to_ip);
    }

    setTimeout(get_toggles, 500);
}

function get_toggles()
{
    getting_toggles_flag = true;
    send_udp_string("^^Id-V", connected_port, send_to_ip);
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

function array_to_ascii(array)
{
    var str = "";
    array.forEach(function(i){
        str += String.fromCharCode(i);
    });
    return str;
}