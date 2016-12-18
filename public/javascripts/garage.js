$(function() {
    $('#container').hide();
    var socket = io.connect("http://192.168.50.175:3000/");
    var door_status = 'Unknown';
    
    socket.on('cok', function(data) {
        socket.emit('dstatus', 'can i get status?');
        $('#container').show();
        updateLogText(data);
    });
    
    socket.on('ginfo', function(data) {
        door_status = data;
        $('#statusbtn').text('Garage is: ' + door_status);
        setActionButtonText();
    });
    
    socket.on('log', function(data) {
        updateLogText(data);
    });

    $('button#statusbtn').click(function() {
        $('#statusbtn .btn-text').text('Garage is: ...........');
        socket.emit('dstatus', 'got status?');
    });

    $('button#actionbtn').click(function() {
        socket.emit('move', 'move the garage please');
    });
    
    function setActionButtonText() {
        var text = 'refresh status';
        if (door_status == 'Open') { text = 'Close it!'; }
        $('#actionbtn .btn-text').text(text);
    };

    function updateLogText(data) {
        $('#log').val(new Date().toLocaleTimeString() + ' : ' + data + '\n' + $('#log').val());
    };
});
