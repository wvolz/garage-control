$(function() {
    $('#container').hide();
    var socket = io.connect("http://garagepi.local:3000/");
    var status = 'Unknown';
    
    socket.on('cok', function(data) {
        socket.emit('status', 'can i get status?');
        $('#container').show();
        updateLogText(data);
    });
    
    socket.on('ginfo', function(data) {
        status = data;
        $('#statusbtn').text('Garage is: ' + status);
        setActionButtonText();
    });
    
    socket.on('log', function(data) {
        updateLogText(data);
    });

    $('button#statusbtn').click(function() {
        $('#statusbtn .btn-text').text('Garage is: ...........');
        socket.emit('status', 'got status?');
    });

    $('button#actionbtn').click(function() {
        socket.emit('move', 'move the garage please');
    });
    
    function setActionButtonText() {
        var text = 'refresh status';
        if (status == 'Open') { text = 'Close it!'; }
        $('#actionbtn .btn-text').text(text);
    };

    function updateLogText(data) {
        $('#log').val(new Date().toLocaleTimeString() + ' : ' + data + '\n' + $('#log').val());
    };
});
