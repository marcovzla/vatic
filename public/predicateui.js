function PredicateUI(newpredbutton, newpreddialog, predcontainer, videoframe, job, player, predicates) {
    var me = this;
    this.newpredbutton = newpredbutton;
    this.newpreddialog = newpreddialog;
    this.predcontainer = predcontainer;
    this.predname = {};
    
    this.setup = function() {
        // create newpredbutton
        this.newpredbutton.button({
            icons: { primary: "ui-icon-plusthick" },
            disabled: false
        }).click(function() {
            me.newpreddialog.dialog('open');
        });
        
        // create newpreddialog
        this.newpreddialog.dialog({
            title: 'create a predicate',
            autoOpen: false,
            modal: true,
            height: 450,
            width: 250,
            buttons: {
                ok: function() {
                    // get the selected predicate type
                    pred_id = $('input[name="predicates"]:checked').val();
                    if (!pred_id) {
                        alert('please select a predicate');
                        return;
                    }

                    // add new predicate to the list
                    var newprednum = me.predcontainer.children().length + 1;
                    var newpredname = me.predname[pred_id];
                    $('<div class="predblock"><div style="float:left">' + 
                      newprednum + ' ' + newpredname +
	              '</div><div style="float:right"><a href="#">add track</a></div><br></div>')
                        .hide()
                        .appendTo(me.predcontainer)
                        .show('slow');

                    // close dialog
                    $(this).dialog('close');
                },
                cancel: function() {
                    $(this).dialog('close');
                }
            }
        });
        
        // request list of predicates 
        $.getJSON('/server/getpredicates', function(data) {
            for (var p in data) {
                var predid = data[p][0];
                var predname = data[p][1];
                // collect predicate ids and names
                me.predname[predid] = predname;
                // add radio buton to newpreddialog
                me.newpreddialog.append('<input type="radio" name="predicates" id="' +
                                        predid + '" value="' + predid +
                                        '"><label for="' + predid + '">' +
                                        predname + '</label><br>');
            }
        });
    }
    
    this.setup();
}

function PredicateCollection(player, job) {
    var me = this;
    this.player = player;
    this.job = job;
    
    this.serialize = function() {
        return '[{"predicate":35,"annotations":{"0":[[10,1,true],[70,1,false]],"1":[[25,2,true],[100,2,false],[120,3,true]]}}]';
    };
}
