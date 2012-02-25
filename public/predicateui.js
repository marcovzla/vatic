function PredicateUI(newpredbutton, newpreddialog, predcontainer, newroledialog, videoframe, job, player, tracks, predicates) {
    var me = this;
    this.newpredbutton = newpredbutton;
    this.newpreddialog = newpreddialog;
    this.predcontainer = predcontainer;
    this.newroledialog = newroledialog;
    this.predname = {};
    this.rolename = {};
    this.job = job;
    this.tracks = tracks;
    this.predicates = predicates;
    
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
            title: 'new predicate',
            autoOpen: false,
            modal: true,
            height: 450,
            width: 250,
            buttons: {
                ok: function() {
                    // get the selected predicate type
                    var pred_id = $('input[name="predicates"]:checked').val();
                    if (!pred_id) {
                        alert('please select a predicate');
                        return;
                    }

                    // add new predicate to the list
                    var newprednum = me.predcontainer.children().length + 1;
                    var newpredname = me.predname[pred_id];

					var pred_instance = me.predicates.new_predicate(pred_id);

                    $('<div class="predblock"><div style="float:left">' + 
                      newpredname + ' ' + newprednum +
                      '</div><div style="float:right"><a class="addrole" href="#">add track</a></div>' + 
					  '<input type="hidden" class="predinstance_id" value="' + pred_instance + '"><br></div>')
                        .hide()
                        .prependTo(me.predcontainer)
                        .show('slow');

                    // close dialog
                    $(this).dialog('close');
                },
                cancel: function() {
                    $(this).dialog('close');
                }
            }
        });

        $('a.addrole').live('click', function(e) {
            e.preventDefault();
            var tracknames = {};
            $('#available_tracks').empty();
            for (var i in me.tracks.tracks) {
                tracknames[i] = me.job.labels[me.tracks.tracks[i].label] + ' ' + (parseInt(i) + 1);
                $('#available_tracks').append('<input type="radio" name="avtracks" id="t' + i +
                                              '" value="' + i + '"><label for="t' + i + '">' +
                                              tracknames[i] + '</label><br>');
            }
            me.newroledialog
                .data('link', $(this))
                .data('tracknames', tracknames)
                .dialog('open');
        });

        this.newroledialog.dialog({
            title: 'add track',
            autoOpen: false,
            modal: true,
            height: 300,
            width: 400,
            buttons: {
                ok: function() {
                    // get the selected track type
                    var track_id = $('input[name="avtracks"]:checked').val();
                    if (!track_id) {
                        alert('please select a track');
                        return;
                    }

                    var role_id = $('#selrole option:selected').val();

					var predinstance_id = $(this).data('link')
			                                     .parent()
			                                     .siblings('.predinstance_id')
			                                     .val();
					
					var added = me.predicates.add_track(predinstance_id, track_id, role_id);
					if (added) {
                    	var tracknames = $(this).data('tracknames');
                   		$('<input type="checkbox" id="cbp' + track_id + '">' + 
                      	  '<label for="cbp' + track_id  + '">' + tracknames[track_id] +
                      	  ' <small>(' + me.rolename[role_id] + ')</small></label><br>')
                        	.hide()
                        	.appendTo($(this).data('link').parent().parent())
                        	.show('slow');
					}
					else {
						alert('track is already in predicate');
					}

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
                // add radio button to newpreddialog
                me.newpreddialog.append('<input type="radio" name="predicates" id="p' +
                                        predid + '" value="' + predid +
                                        '"><label for="p' + predid + '">' +
                                        predname + '</label><br>');
            }
        });
    }

    // request list of roles
    $.getJSON('/server/getroles', function(data) {
        var select = $('<select id="selrole"></select>');
        for (var p in data) {
            var roleid = data[p][0];
            var rolename = data[p][1];
            me.rolename[roleid] = rolename;
            select.append('<option value="' + roleid + '">' + rolename + '</option>');
        }
        me.newroledialog.append('<label>role:</label>');
        me.newroledialog.append(select);
        me.newroledialog.append('<hr><div id="available_tracks"></div>');
    });
    
    this.setup();
}

function PredicateCollection(player, job) {
    var me = this;
    this.player = player;
    this.job = job;
	this.data = [];
    
	this.new_predicate = function(pred_id) {
		var idx = me.data.length;
		me.data.push({
			predicate: pred_id,
			annotations: {}
		});
		return idx;
	}

	this.add_track = function(idx, track_id, role_id) {
		if (track_id in me.data[idx]['annotations']) {
			return false;
		}
		me.data[idx]['annotations'][track_id] = [];
		return true;
	}
	
    this.serialize = function() {
        return '[{"predicate":35,"annotations":{"0":[[10,1,true],[70,1,false]],"1":[[25,2,true],[100,2,false],[120,3,true]]}}]';
    };
}
