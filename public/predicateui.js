function PredicateUI(newpredbutton, newpreddialog, predcontainer, newroledialog, videoframe, job, player, tracks, predicates) {
    var me = this;
    this.newpredbutton = newpredbutton;
    this.newpreddialog = newpreddialog;
    this.predcontainer = predcontainer;
    this.newroledialog = newroledialog;
    this.predname = {};
    this.rolename = {};
    this.job = job;
	this.player = player;
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
            close: function() {
                $('#selrole option:eq(0)').attr('selected', true);
            },
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
					
					var added = me.predicates.add_track(predinstance_id, track_id);
					if (added) {
                    	var tracknames = $(this).data('tracknames');
                   		$('<input type="checkbox" class="cbtrack" id="cbp' + predinstance_id + '_' + track_id +
						  '" value="' + track_id + '_' + role_id + '">' + 
                      	  '<label for="cbp' + predinstance_id + '_' + track_id  + '">' + tracknames[track_id] +
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

        $('input.cbtrack').live('click', function() {
            var predinstance_id = $(this).siblings('.predinstance_id').val();
			var trackrole = $(this).val().split('_');
			me.predicates.add_annotation(predinstance_id, trackrole[0], me.player.frame, trackrole[1], this.checked);
		});

		this.player.onupdate.push(function() {
			me.update_checkboxes();
		});

		this.update_checkboxes = function() {
			var frame = me.player.frame;
            for (var idx in me.predicates.data) {
				for (var track_id in me.predicates.data[idx]['annotations']) {
					var val = me.predicates.getval(idx, track_id, frame);
					$('#cbp' + idx + '_' + track_id).attr('checked', val);
				}
			}
		}
        
        me.predname = job.predicates;
        for (var p in me.predname) {
            me.newpreddialog.append('<input type="radio" name="predicates" id="p' +
                                    p + '" value="' + p + '"><label for="p' + p + '">' +
                                    me.predname[p] + '</label><br>');
        }

        me.rolename = job.roles;
        var select = $('<select id="selrole"></select>');
        for (var r in me.rolename) {
            select.append('<option value="' + r + '">' + me.rolename[r] + '</option>');
        }
        me.newroledialog.append('<label>role:</label>');
        me.newroledialog.append(select);
        me.newroledialog.append('<hr><div id="available_tracks"></div>');
    }

    this.remove_track = function(track_id) {
        me.predicates.remove_track(track_id);
        me.predcontainer.empty();
        me.draw_my_data(track_id);
    }

    this.draw_my_data = function(deleted_track_id) {
        for (var i in me.predicates.data) {
            var newprednum = parseInt(i) + 1;
            var newpredname = me.predname[me.predicates.data[i]['predicate']];
            var pred_instance = i;
            var pred = $('<div class="predblock"><div style="float:left">' +
                         newpredname + ' ' + newprednum +
                         '</div><div style="float:right"><a class="addrole" href="#">add track</a></div>' + 
                         '<input type="hidden" class="predinstance_id" value="' + pred_instance + '"><br></div>')
                           .prependTo(me.predcontainer);

            for (var j in me.predicates.data[i]['annotations']) {
                var track_id = j;
                var role_id = me.predicates.data[i]['annotations'][j][0][1]; // XXX not safe
                if (deleted_track_id !== undefined && parseInt(deleted_track_id) <= parseInt(j)) {
                    alert(deleted_track_id + ' >= ' + j);
                    var trackname = me.job.labels[me.tracks.tracks[j].label] + ' ' + (parseInt(j) + 2);
                }
                else {
                    var trackname = me.job.labels[me.tracks.tracks[j].label] + ' ' + (parseInt(j) + 1);
                }
                $('<input type="checkbox" class="cbtrack" id="cbp' + pred_instance + '_' + track_id +
                  '" value="' + track_id + '_' + role_id + '">' + 
                  '<label for="cbp' + pred_instance + '_' + track_id  + '">' + trackname +
                  ' <small>(' + me.rolename[role_id] + ')</small></label><br>')
                    .appendTo(pred);
            }
        }
    }

    this.draw_data = function() {
        $.getJSON('/server/getpredicateannotationsforjob/' + me.job.jobid, function(data) {
            if (data.length > 0) {
                me.predicates.data = data;
                me.draw_my_data();
            }
        });
    }
    
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
			predicate: parseInt(pred_id),
			annotations: {}
		});
		return idx;
	}

	this.add_track = function(idx, track_id) {
		if (track_id in me.data[idx]['annotations']) {
			return false;
		}
		me.data[idx]['annotations'][track_id] = [];
		return true;
	}

    this.remove_track = function(track_id) {
        var data = [];
        for (var pred_id in me.data) {
            var pred = me.data[pred_id];
            var pred2 = {};
            pred2['predicate'] = pred['predicate'];
            pred2['annotations'] = [];
            for (var tid in pred['annotations']) {
                var ntid = parseInt(tid);
                var ntrack_id = parseInt(track_id);
                if (ntid === ntrack_id) {
                    continue;
                }
                else if (ntid > ntrack_id) {
                    pred2['annotations'][(ntid-1)+''] = pred['annotations'][tid];
                }
                else {
                    pred2['annotations'][tid] = pred['annotations'][tid];
                }
            }
            data.push(pred2);
        }
        me.data = data;
    }

	this.add_annotation = function(idx, track_id, frame, role_id, value) {
		var annotations = me.data[idx]['annotations'][track_id];
		for (var i in annotations) {
			var f = annotations[i][0];
			if (f >= frame) {
				annotations.splice(i);
				break;
			}
		}
		annotations.push([frame, parseInt(role_id), value]);
	}

	this.getval = function(idx, track_id, frame) {
		var val = false;
		var annotations = me.data[idx]['annotations'][track_id];
		for (var i in annotations) {
			var f = annotations[i][0];
			if (f > frame) {
				break;
			}
			val = annotations[i][2];
		}
		return val;
	}
	
    this.serialize = function() {
        return JSON.stringify(me.data);
    };
}
