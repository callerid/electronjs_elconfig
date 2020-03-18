const dgram = require('dgram');
const os = require('os');
const app = require('electron').remote.app;
const file_reader = require('fs');

var server3520 = dgram.createSocket({type:"udp4", reuseAddr:true});
var server6699 = dgram.createSocket({type:"udp4", reuseAddr:true});

const HOST = '0.0.0.0';
var bound3520 = false;
var bound6699 = false;
var program_bound_6699 = "";
var program_bound_3520 = "";

var connected_port = 0;
var found_unit = false;
var is_deluxe_unit = false;
var all_known_pc_ips = [];
var pc_suggested_ip = "192.168.0.90";
var computer_info_ip;
var computer_info_mac;
var all_subnets = [];
var macs_of_ips = [];
var send_to_ip = '';
var last_sent_ip = '';
var ping_alternator = 0;
var setting_to_basic = false;
var last_connect_seconds = 7;

var processing_v_command = false;
var processing_x_command = false;

var last_v_command_reception = "";
var getting_toggles_flag = false;

var last_call_record_reception = "";
var last_detailed_record_reception = "";

var last_x_command_reception = [];

var this_os = process.platform;

// Edit Settings
var editing_unit_number = false;
var editing_unit_ip = false;
var editing_unit_mac = false;
var editing_dest_port = false;
var editing_dest_ip = false;
var editing_dest_mac = false;

server3520.on('error', function(error){

    console.log('3520 failed to bind.');
    bound3520 = false;

});

server6699.on('error', function(error){

    console.log('6699 failed to bind.');
    bound6699 = false;

});

server3520.on('listening', function() {

    bound3520 = true;
    server3520.setBroadcast(true);
    var address = server3520.address();
    console.log('UDP Server listening on ' + address.address + ':' + address.port);

});

server6699.on('listening', function() {

    bound6699 = true;
    server6699.setBroadcast(true);
    var address = server6699.address();
    console.log('UDP Server listening on ' + address.address + ':' + address.port);

});

server3520.on('message', function(message, remote) {

    // Comm command -------------------------------------------------
    check_for_v_command(message, remote);
    check_for_x_command(message, remote);
    check_for_call_record(message);
    check_boot(message);
    check_updated(message);
    //---------------------------------------------------------------

});

server6699.on('message', function(message, remote) {

    // Comm command -------------------------------------------------
    check_for_v_command(message, remote);
    check_for_x_command(message, remote);
    check_for_call_record(message);
    check_boot(message);
    check_updated(message);
    //---------------------------------------------------------------

});

function watch_for_status_change()
{
    last_connect_seconds++;

    var status = $("#lbStatus").text();

    if(last_connect_seconds > 6)
    {
        if(status == "NOT Connected")
        {
            setTimeout(watch_for_status_change, 1000);
            return;
        }

        $("#lbStatus").text("NOT Connected");
        $("#imgConnected").addClass("hidden");
        $("#lbDeluxeUnit").text("Deluxe Unit NOT Detected");
        $("#status_bar").removeClass("status_bar_connected");
        $("#status_bar").addClass("status_bar_disconnected");

        $("#edit_settings").addClass("hidden");
        $("#not_connected").removeClass("hidden");
        $("#toggle_settings").addClass("hidden");

    }
    else
    {
        if(status == "NOT Connected")
        {
            $("#lbStatus").text("Connected");
            $("#imgConnected").removeClass("hidden");
            $("#status_bar").removeClass("status_bar_disconnected");
            $("#status_bar").addClass("status_bar_connected");
            $("#edit_settings").removeClass("hidden");

            $("#edit_settings").removeClass("hidden");
            $("#not_connected").addClass("hidden");
            $("#toggle_settings").removeClass("hidden");
        }
    }


    setTimeout(watch_for_status_change, 1000);

}

function check_updated(message)
{
    var message_str = array_to_ascii(message);
    
    if(message.length < 57 && message_str.indexOf("ok") > 0)
    {
        write_to_comm("Unit Updated");
    }
}

function check_boot(message)
{
    if(message.length == 52)
    {
        var message_str = array_to_ascii(message);
        var pattern = /(\d{1,2}) V/;

        var results = pattern.exec(message_str);
        
        if(results == null) return;
        if(results.length > 0)
        {
            write_to_comm(message_str.substr(21, message.length - 21));
        }

    }
}

function check_for_call_record(message)
{
    // Detailed call record
    if(message.length == 52)
    {
        var message_str = array_to_ascii(message);

        var pattern = /(\d{1,2}) V/;

        var results = pattern.exec(message_str);
        
        if(results != null) return;

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
        last_connect_seconds = 0;

        processing_x_command = true;

        // Update target unit location
        found_unit = true;

        if(send_to_ip != last_sent_ip || connected_port != remote.port)
        {
            $("#lbSendingTo").html("Sending To: <b>" + last_sent_ip + "</b> &nbsp;&nbsp;&nbsp;Port: <b>" + remote.port + "</b>");
        }

        send_to_ip = last_sent_ip;
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

        // Computer Info
        handle_computer_info();

        // Parse all unit settings
        if(!editing_unit_number)
        {
            var unit_number = "";
            for(var i = 4; i < 10; i++)
            {
                unit_number += message_byte[i].toString();
            }
            $("#tbUnitNumber").val(unit_number);
        }
        
        var cnt = 1;
        if(!editing_unit_ip)
        {
            for(var i = 33; i < 37; i++)
            {
                var part = message_byte[i].toString();
                $("#tbUnitIP_" + cnt).val(part);
                cnt++;
            }
        }

        if(!editing_unit_mac)
        {
            cnt = 1;
            for(var i = 24; i < 30; i++)
            {
                var part = message_byte[i].toString(16).padStart(2, '0');
                $("#tbUnitMAC_" + cnt).val(part);
                cnt++;
            }
        }

        if(!editing_dest_port)
        {
            var dest_port = "";
            for (var i = 52; i <= 53; i++)
            {
                var int_value = message_byte[i];
                var hex_value = int_value.toString(16).padStart(2, '0');
                dest_port += hex_value;
            }
            dest_port = parseInt(dest_port, 16);
            $("#cbDestPort").val(dest_port);
        }
        
        if(!editing_dest_ip)
        {
            cnt = 1;
            var dest_ip = "";
            for(var i = 40; i < 44; i++)
            {
                var part = message_byte[i].toString();
                $("#tbDestIP_" + cnt).val(part);
                dest_ip += part + ".";
                cnt++;
            }
            $("#pWin_computer_info_dest_ip").text(dest_ip.substr(0, dest_ip.length - 1));
        }        

        if(!editing_dest_mac)
        {
            cnt = 1;
            var dest_mac = "";
            for(var i = 66; i < 72; i++)
            {
                var part = message_byte[i].toString(16).toUpperCase().padStart(2, '0');
                $("#tbDestMAC_" + cnt).val(part);
                dest_mac += part + "-";
                cnt++;
            }
            $("#pWin_computer_info_dest_mac").text(dest_mac.substr(0, dest_mac.length - 1));
        }        

        var dups = "";
        dups = message_byte[75].toString();
        $("#lbDups").text(dups);


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

        var pattern = /L=([0-9]{2})/;
        var line_count = pattern.exec(message_str);

        $("#lbLineCount").text(line_count[1]);
        $("#pWin_line_count_current_count").text(line_count[1]);

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
    if(!bound3520)
    {
        server3520.bind(3520, HOST);
    }

    if(!bound6699)
    {
        server6699.bind(6699, HOST);
    }
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
        if(setting_to_basic)
        {
            setTimeout(send_pinging_commands, 1500);
            return;
        }

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

// Functions for editing settings
function set_unit_number(unit_number)
{
    send_udp_string("^^IdU000000" + unit_number.padStart(6, "0"), connected_port, send_to_ip);
}

function set_unit_ip(unit_ip)
{
    var hex_ip = make_ip_hex_string(unit_ip);
    send_udp_string("^^IdI" + hex_ip, connected_port, send_to_ip);
}

function set_dest_port(port)
{
    console.log(port);
    if(port == "6699")
    {
        send_udp_string("^^IdT1A2B", connected_port, send_to_ip);
    }
    else
    {
        send_udp_string("^^IdT0DC0", connected_port, send_to_ip);
    }
}

function set_dest_ip(dest_ip)
{
    var hex_ip = make_ip_hex_string(dest_ip);
    send_udp_string("^^IdD" + hex_ip, connected_port, send_to_ip);
}

function set_dest_mac(dest_mac)
{
    send_udp_string("^^IdC" + dest_mac, connected_port, send_to_ip);
}

function set_dups(dup_count)
{
    var hex_dup = parseInt(dup_count).toString(16);
    send_udp_string("^^IdO" + dup_count, connected_port, send_to_ip);
}

function set_line_count(line_count)
{
    var send_str = "";
    switch (line_count)
    {

        case "01":
            send_str = "^^Id-N0000007701\r\n";
            break;

        case "05":
            send_str = "^^Id-N0000007705\r\n";
            break;

        case "09":
            send_str = "^^Id-N0000007709\r\n";
            break;

        case "17":
            send_str = "^^Id-N0000007711\r\n";
            break;

        case "21":
            send_str = "^^Id-N0000007715\r\n";
            break;

        case "25":
            send_str = "^^Id-N0000007719\r\n";
            break;

        case "33":
            send_str = "^^Id-N0000007721\r\n";
            break;
    }

    send_udp_string(send_str, connected_port, send_to_ip);
}

function set_deluxe_unit_output_defaults()
{
    open_setting_deluxe_output();

    var ms_between_sends = 500;

    $("#pWin_deluxe_output_progressbar").progressbar( "option", {
        value: 50 * 1
    });

    send_udp_string("^^Id-N0000007701", connected_port, send_to_ip);

    setTimeout(function(){

        send_udp_string("^^Id-R", connected_port, send_to_ip);

        $("#pWin_deluxe_output_progressbar").progressbar( "option", {
            value: 50 * 2
        });

        setTimeout(function(){

            pWin_setting_deluxe_output.dialog('close');

        }, ms_between_sends);

    }, ms_between_sends);

}

function reset_ethernet_defaults()
{
    open_resetting_el_defaults();

    var ms_between_sends = 500;

    send_udp_string("^^IdDFFFFFFFF", connected_port, send_to_ip);

    $("#pWin_reseting_to_el_defaults_progressbar").progressbar( "option", {
        value: 16 * 1
    });

    setTimeout(function(){

        send_udp_string("^^IdU000000000001", connected_port, send_to_ip);

        $("#pWin_reseting_to_el_defaults_progressbar").progressbar( "option", {
            value: 16 * 2
        });

        setTimeout(function(){

            send_udp_string("^^IdIC0A8005A", connected_port, send_to_ip);

            $("#pWin_reseting_to_el_defaults_progressbar").progressbar( "option", {
                value: 16 * 3
            });

            setTimeout(function(){

                send_udp_string("^^IdCFFFFFFFFFFFF", connected_port, send_to_ip);

                $("#pWin_reseting_to_el_defaults_progressbar").progressbar( "option", {
                    value: 16 * 4
                });

                setTimeout(function(){

                    send_udp_string("^^IdT0DC0", connected_port, send_to_ip);

                    $("#pWin_reseting_to_el_defaults_progressbar").progressbar( "option", {
                        value: 16 * 5
                    });

                    setTimeout(function(){

                        set_dups("01");

                        $("#pWin_reseting_to_el_defaults_progressbar").progressbar( "option", {
                            value: 16 * 6
                        });

                        setTimeout(function(){

                            pWin_reseting_to_el_defaults.dialog('close');

                        }, ms_between_sends);

                    }, ms_between_sends);

                }, ms_between_sends);

            }, ms_between_sends);

        }, ms_between_sends);

    }, ms_between_sends);
}

function set_pc_time()
{
    var now = new Date();

    var send_str = parseInt(now.getMonth()).toString().padStart(2, "0") + parseInt(now.getDay()).toString().padStart(2, "0") + 
    parseInt(now.getHours()).toString().padStart(2, "0") + parseInt(now.getMinutes()).toString().padStart(2, "0");
        
    send_udp_string("^^Id-Z" + send_str + "\r", connected_port, send_to_ip);

    alert_time_changed();

}

function set_deluxe_to_basic()
{

    setting_to_basic = true;

    open_deluxe_to_basic();

    var ms_between_sends = 100;

    $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
        value: 7 * 1
    });

    set_toggle("A");

    setTimeout(function(){

        $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
            value: 7 * 2
        });

        set_toggle("e");

        setTimeout(function(){

            $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                value: 7 * 3
            });

            set_toggle("c");

            setTimeout(function(){

                $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                    value: 7 * 4
                });

                set_toggle("x");

                setTimeout(function(){

                    $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                        value: 7 * 5
                    });

                    set_toggle("u");

                    setTimeout(function(){

                        $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                            value: 7 * 6
                        });

                        set_toggle("k");

                        setTimeout(function(){

                            $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                                value: 7 * 7
                            });

                            set_toggle("s");

                            setTimeout(function(){

                                $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                                    value: 7 * 8
                                });

                                set_toggle("b");

                                setTimeout(function(){

                                    $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                                        value: 7 * 9
                                    });

                                    set_toggle("d");

                                    setTimeout(function(){

                                        $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                                            value: 7 * 10
                                        });

                                        set_toggle("o");

                                        setTimeout(function(){

                                            $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                                                value: 7 * 11
                                            });

                                            set_toggle("t");

                                            setTimeout(function(){

                                                $("#pWin_deluxe_to_basic_progressbar").progressbar( "option", {
                                                    value: 7 * 13
                                                });

                                                setting_to_basic = false;
                                                pWin_deluxe_to_basic.dialog('close');
                                        
                                            }, ms_between_sends);
                                    
                                        }, ms_between_sends);
                                
                                    }, ms_between_sends);
                            
                                }, ms_between_sends);
                        
                            }, ms_between_sends);
                    
                        }, ms_between_sends);
                
                    }, ms_between_sends);
            
                }, ms_between_sends);
        
            }, ms_between_sends);
    
        }, ms_between_sends);

    }, ms_between_sends);

}

// ----------------------------------

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

    if(setting_to_basic) return;
    setTimeout(get_toggles, 750);
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
                
                var mac_entry = [iface.mac, single_ip];
                macs_of_ips.push(mac_entry);

            } 
            else 
            {
                var single_ip = iface.address;
                all_known_pc_ips.push(single_ip);

                var mac_entry = [iface.mac, single_ip];
                macs_of_ips.push(mac_entry);

            }

            ++alias;

        });
    });

    all_subnets = [];

    all_known_pc_ips.forEach(function(ip){
        
        var subnet_address = convert_to_subnet_broadcast(ip, false);
        var subnet_limited_address = convert_to_subnet_broadcast(ip, true);

        if(!all_subnets.includes(subnet_address)) all_subnets.push(subnet_address);
        if(!all_subnets.includes(subnet_limited_address)) all_subnets.push(subnet_limited_address);

    });
}

function convert_to_subnet_broadcast(ip, limited)
{
    var breakpoint = nth_pattern_occurance_in_string(ip, '.', 2);
    var breakpoint_limited = nth_pattern_occurance_in_string(ip, '.', 3);

    if(limited) return ip.substr(0, breakpoint_limited) + ".255";
    return ip.substr(0, breakpoint) + ".255.255";
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
    last_sent_ip = ip;
    console.log('Sending: ' + to_send_str + " on: " + port + " to: " + ip);
    
    switch(port)
    {
        case 3520:

            server3520.send(Buffer.from(to_send_str), port, ip, function(err){

                if(err != null) console.log("ERROR SENDING UDP: " + err.message);
        
            });

        break;

        case 6699:

            server6699.send(Buffer.from(to_send_str), port, ip, function(err){

                if(err != null) console.log("ERROR SENDING UDP: " + err.message);
        
            });

        break;

        default:

            // Non typical UDP send port

        break;
    }

}

function get_bound_programs()
{

    switch(this_os)
    {
        case "win32":

            var spawn = require("child_process").spawn,child;
            child = spawn("powershell.exe", ["Start-Process cmd -Verb RunAs '/c netstat -ab -p udp > " + app.getAppPath() + "/bound_programs.txt'"]);
            child.on("exit",function(){
                
                filter_bound_programs_win();

            });
            child.stdin.end(); //end input

        break;

        case "darwin":

        break;
    }    

}

function filter_bound_programs_win()
{

    file_reader.readFile(app.getAppPath() + "/bound_programs.txt", (err, data) => {
        
        if (err) {
          console.error(err)
          return
        }

        program_bound_6699 = get_program_bound_to_port(array_to_ascii(data), 6699);
        program_bound_3520 = get_program_bound_to_port(array_to_ascii(data), 3520);

        if(program_bound_6699 == "electron.exe") program_bound_6699 = "ELConfig 5";
        if(program_bound_3520 == "electron.exe") program_bound_3520 = "ELConfig 5";

        setTimeout(finish_open_bound_programs(), 1000);

      });
    
}

function get_program_bound_to_port(read_in, port)
{
    
    var index = read_in.indexOf("0.0.0.0:" + port);

    if(index == -1) return "No Program Bound";

    var start_index = index;
    var part_read_in = read_in.substr(start_index);
    var end_index = part_read_in.indexOf("]");
    var part = part_read_in.substr(0, end_index + 1);

    var pattern = /(\[(.+)\])/;
    var names = pattern.exec(part);
    
    return names[1].replace("[","").replace("]","");
}

function handle_computer_info()
{
    determine_computer_info();
    
    info_content_unit_ip = info_content_unit_ip.replace("[computer_ip]", "<b>" + computer_info_ip + "</b>");

    var suggested_ip_parts = computer_info_ip.split('.');
    var suggested_ip = suggested_ip_parts[0] + "." + suggested_ip_parts[1] + "." + suggested_ip_parts[2] + ".90";

    pc_suggested_ip_parts = [suggested_ip_parts[0], suggested_ip_parts[1], suggested_ip_parts[2], "90"]

    info_content_unit_ip = info_content_unit_ip.replace("[suggested_ip]", "<b>" + suggested_ip + "</b>");

    // Populate popup Computer Info
    $("#pWin_computer_info_com_ip").text(computer_info_ip);
    $("#pWin_computer_info_com_mac").text(computer_info_mac);
}

function determine_computer_info()
{
    
    if(all_known_pc_ips.length == 1)
    {
        computer_info_ip = all_known_pc_ips[0];
        computer_info_mac = get_mac_of_ip(computer_info_ip);
        return;
    }

    if(all_known_pc_ips.length == 0) return;

    if(send_to_ip.length == 0)
    {
        computer_info_ip = all_known_pc_ips[0];
        computer_info_mac = get_mac_of_ip(computer_info_ip);
        return;
    }

    // More than one ethernet card on pc so find closest match
    var best_rating = 0;
    var best_pick_for_ip = all_known_pc_ips[0];
    all_known_pc_ips.forEach(function(ip){

        var rating = ip_match_rating(ip, send_to_ip);

        if(rating > best_rating)
        {
            best_rating = rating;
            best_pick_for_ip = ip;
        }

    });

    computer_info_ip = best_pick_for_ip;
    computer_info_mac = get_mac_of_ip(best_pick_for_ip);

}

function ip_match_rating(ip_1, ip_2)
{
    var ip_1_parts = ip_1.split('.');
    var ip_2_parts = ip_2.split('.');
    var rating = 0;

    for(var i=0; i < ip_1_parts.length; i++)
    {
        if(parseInt(ip_1_parts[i]) == parseInt(ip_2_parts[i]))
        {
            rating++;
        }
        else
        {
            return rating;
        }
    }

    return rating;
}

function get_mac_of_ip(this_ip)
{
    var mac = "00-00-00-00-00-00";
    macs_of_ips.forEach(function(entry){

        if(entry[1] == this_ip) mac = entry[0];

    });

    mac = mac.split(/:/).join("-");
    return mac.toUpperCase();
}

function send_udp_string_and_bytes(to_send_str, to_send_bytes, port, ip)
{
    // Send via UDP port
    socket.send(Buffer.from(to_send_str) + to_send_bytes, port, ip);
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

function ping_ip(ip)
{
    
    if(this_os == "win32")
    {
        $("#pWin_ping_ip_return").text("Pinging...");
        var exec = require('child_process').exec("ping " + ip, function(error, stdout, stderr){
        
            $("#pWin_ping_ip_return").html(stdout);
    
        });
    }
    else if(this_os == "darwin")
    {
        $("#pWin_ping_ip_return").text("Pinging...");

        var exec = require('child_process').exec("ping -c 4 " + ip, function(error, stdout, stderr){
        
            $("#pWin_ping_ip_return").html(stdout);
    
        });

    }
    else
    {
        $("#pWin_ping_ip_return").text("Pinging not supported on OS.");
    }

}

function make_ip_hex_string(ip)
{
    var parts = ip.split(".");

    if(parts.length != 4) return "00000000";

    var hex = "";

    parts.forEach(function(part){

        var hex_str = parseInt(part).toString(16).padStart(2, "0");
        hex += hex_str;

    });

    return hex.toUpperCase();
}

function array_to_ascii(array)
{
    var str = "";
    array.forEach(function(i){
        str += String.fromCharCode(i);
    });
    return str;
}
