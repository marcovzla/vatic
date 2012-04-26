function GroupUI(newgroupbutton, newgroupdialog, groupcontainer, newmembershipdialog, videoframe, job, player, tracks, groups) {
    var me = this;
    this.newgroupbutton = newgroupbutton;
    this.newgroupdialog = newgroupdialog;
    this.groupcontainer = groupcontainer;
    this.newmembershipdialog = newmembershipdialog;
    this.groupname = {};
    this.membershipname = {};
    this.job = job;
    this.player = player;
    this.tracks = tracks;
    this.groups = groups;
    
    this.setup = function() {
        // create newpredbutton
        this.newgroupbutton.button({
            icons: { primary: "ui-icon-plusthick" },
            disabled: false
        }).click(function() {
            ui_disabled = 1;
            me.newgroupdialog.dialog('open');
        });
        
        // create newpreddialog
        this.newgroupdialog.dialog({
            title: 'new group',
            autoOpen: false,
            modal: true,
            height: 450,
            width: 350,
            buttons: {
                ok: function() {
                    // get the selected predicate type
                    var group_id = $('input[name="groups"]:checked').val();
                    if (!group_id) {
                        alert('please select a group');
                        return;
                    }

                    var group_instance = me.groups.new_group(group_id);

                    // add new predicate to the list
                    var newgroupnum = group_instance + 1;
                    var newgroupname = me.groupname[group_id];

                    $('<div class="groupblock"><div style="float:left">' + 
                      newgroupname + ' ' + newgroupnum +
                      '</div><div style="float:right">' +
                      '<div style="float:right">' +
                      '<div class="ui-icon ui-icon-trash delgroupins"' +
                      ' title="delete group"></div></div>' +
                      '<div style="float:right">' +
                      '<div class="ui-icon ui-icon-plusthick addmembership"' +
                      ' title="add track"></div></div>' +
                      '</div>' +
                      '<input type="hidden" class="groupinstance_id" value="' +
                      group_instance + '"><br></div>')
                        .hide()
                        .prependTo(me.groupcontainer)
                        .show('slow');

                    // close dialog
                    $(this).dialog('close');
                },
                cancel: function() {
                    $(this).dialog('close');
                }
            },
            close: function () {
                $('#new_group_txt').val('');
                ui_disabled = 0;
            }
        });

        $('.addmembership').live('click', function(e) {
            ui_disabled = 1;
            //e.preventDefault();
            $('#available_tracks').empty();
            for (var i in me.tracks.tracks) {
                if (me.tracks.tracks[i].deleted) {
                    continue;
                }
                $('#available_tracks').append(
                    '<input type="radio" name="avtracks" id="t' + i +
                    '" value="' + i + '"><label for="t' + i + '">' +
                    me.track_name(i) + '</label><br>');
            }
            me.newmembershipdialog
                .data('link', $(this))
                .dialog('open');
        });

        this.newmembershipdialog.dialog({
            title: 'add track',
            autoOpen: false,
            modal: true,
            height: 300,
            width: 400,
            close: function() {
                $('#selmembership option:eq(0)').attr('selected', true);
                $('#new_membership_txt').val('');
                ui_disabled = 0;
            },
            buttons: {
                ok: function() {
                    // get the selected track type
                    var track_id = $('input[name="avtracks"]:checked').val();
                    if (!track_id) {
                        alert('please select a track');
                        return;
                    }

                    var membership_id = $('#selmembership option:selected').val();
                    if (!membership_id) {
                        alert('please add a membership');
                        return;
                    }

                    var groupinstance_id = $(this).data('link')
                                                  .parent()
                                                  .parent()
                                                  .siblings('.groupinstance_id')
                                                  .val();

                    var added = me.groups.add_track(groupinstance_id,
                                                    track_id);
                    if (!added) {
                        alert('track is already in group');
                        return;
                    }

                    $('<input type="checkbox" class="cbtrack_group" id="cbg' +
                      groupinstance_id + '_' + track_id +
                      '" value="' + track_id + '_' + membership_id + '">' + 
                      '<label for="cbp' + groupinstance_id + '_' + track_id +
                      '">' + me.track_name(track_id) + ' <small>(' + 
                      me.membershipname[membership_id] + ')</small></label>' +
                      '<div style="float:right">' +
                      '<div class="ui-icon ui-icon-trash delgrouparg" ' +
                      'id="grouparg_' + groupinstance_id + '_' + track_id +
                      '" title="delete this track"></div></div><br>')
                        .hide()
                        .appendTo($(this).data('link').parent().parent().parent())
                        .show('slow');
                    // tracks should be added checked by default
                    $('#cbg' + groupinstance_id + '_' + track_id)
                        .attr('checked', true)
                        .click();
                    $(this).dialog('close');
                },
                cancel: function() {
                    $(this).dialog('close');
                }
            }
        });

        $('input.cbtrack_group').live('click', function() {
            var groupinstance_id = $(this).siblings('.groupinstance_id').val();
            var trackmembership = $(this).val().split('_');
            me.groups.add_annotation(groupinstance_id,
                                     trackmembership[0],
                                     me.player.frame,
                                     trackmembership[1],
                                     this.checked);
        });

        $('.delgrouparg').live('click', function () {
            var grouptrack = $(this).attr('id').split('_');
            var group_id = grouptrack[1];
            var group_id = grouptrack[2];
            me.remove_track_for_group(track_id, group_id);
        });

        $('.delgroupins').live('click', function () {
            var group_id = $(this).parent().parent()
                                  .siblings('.groupinstance_id')
                                  .val();
            me.remove_group(group_id);

        });

        this.player.onupdate.push(function() {
            me.update_checkboxes();
        });

        this.update_checkboxes = function() {
            var frame = me.player.frame;
            for (var idx in me.groups.data) {
                if (!me.groups.data[idx]) continue;
                for (var track_id in me.groups.data[idx]['annotations']) {
                    var val = me.groups.getval(idx, track_id, frame);
                    $('#cbg' + idx + '_' + track_id).attr('checked', val);
                }
            }
        }

        // add group to database
        me.newgroupdialog.append('<input type="text" name="new_group_txt" id="new_group_txt">' +
                                 '<button id="add_new_group">add</button><hr>');
        $('#add_new_group').click(function () {
            var grouptxt = $('#new_group_txt').val();
            if (!grouptxt) {
                alert('please write a group name');
                return;
            }
            $.post('/server/savegroupforjob/' + me.job.jobid,
                   JSON.stringify({group:grouptxt}),
                   function (data) {
                       me.groupname[data] = grouptxt;
                       $('<input type="radio" name="groups" id="g' + data +
                         '" value="' + data + '"><label for="g' + data + '">' +
                         me.groupname[data] + '</label><br>')
                            .hide()
                            .appendTo(me.newgroupdialog)
                            .show('slow');
                        $('#new_group_txt').val('');
                   }
            );
        });

        me.groupname = job.groups;
        for (var g in me.groupname) {
            me.newgroupdialog.append('<input type="radio" name="groups" id="g' +
                                     g + '" value="' + g + '"><label for="g' + g + '">' +
                                     me.groupname[g] + '</label><br>');
        }

        me.membershipname = job.memberships;
        var select = $('<select id="selmembership"></select>');
        for (var m in me.membershipname) {
            select.append('<option value="' + m + '">' + me.membershipname[m] + '</option>');
        }
        me.newmembershipdialog.append('<label>membership:</label>');
        me.newmembershipdialog.append(select);
        me.newmembershipdialog.append('<br><input type="text" name="new_membership_txt" id="new_membership_txt">' +
                                      '<button id="add_new_membership">add</button>');
        me.newmembershipdialog.append('<hr><div id="available_tracks"></div>');

        $('#add_new_membership').click(function () {
            var membershiptxt = $('#new_membership_txt').val();
            if (!membershiptxt) {
                alert('please write a membership name');
                return;
            }
            $.post('/server/savemembershipforjob/' + me.job.jobid,
                   JSON.stringify({membership:membershiptxt}),
                   function (data) {
                       me.membershipname[data] = membershiptxt;
                       $('<option value="' + data + '">' +
                         me.membershipname[data] + '</option>')
                            .appendTo('#selmembership');
                       $('#new_membership_txt')
                           .val('')
                           .effect('transfer', {
                               to: '#selmembership',
                               className: 'ui-effects-transfer'
                           }, 500);
                   }
            );
        });
    }

    this.remove_track = function(track_id) {
        me.groups.remove_track(track_id);
        me.groupcontainer.empty();
        me.draw_my_data();
    }

    this.remove_track_for_group = function (track_id, group_id) {
        me.groups.remove_track_for_group(track_id, group_id);
        me.groupcontainer.empty();
        me.draw_my_data();
    };

    this.remove_group = function (group_id) {
        me.groups.remove_group(group_id);
        me.groupcontainer.empty();
        me.draw_my_data();
    };

    this.track_name = function(track_id) {
        track_id = parseInt(track_id);
        if (me.tracks.tracks[track_id].deleted) {
            return; // XXX
        }
        var objects = $('#objectcontainer').children().filter('.trackobject');
        var tid = 0;
        for (var i = 0; i < track_id; i += 1) {
            if (!me.tracks.tracks[i].deleted) {
                tid += 1;
            }
        }
        var idx = objects.length - tid - 1;
        return objects.eq(idx).find('.trackobjectheader > strong').text();
    }

    this.draw_my_data = function() {
        for (var i in me.groups.data) {
            if (!me.groups.data[i]) continue;
            var newgroupnum = parseInt(i) + 1;
            var newgroupname = me.groupname[me.groups.data[i]['group']];
            var group_instance = i;
            var group = $('<div class="groupblock"><div style="float:left">' +
                          newgroupname + ' ' + newgroupnum +
                          '</div><div style="float:right">' +
                          '<div style="float:right">' +
                          '<div class="ui-icon ui-icon-trash delgroupins"' +
                          ' title="delete group"></div></div>' +
                          '<div style="float:right">' +
                          '<div class="ui-icon ui-icon-plusthick addmembership"' +
                          ' title="add track"></div></div></div>' +
                          '<input type="hidden" class="groupinstance_id" ' +
                          'value="' + group_instance + '"><br></div>')
                                .prependTo(me.groupcontainer);

            for (var j in me.groups.data[i]['annotations']) {
                var track_id = j;
                var role_id = me.groups.data[i]['annotations'][j][0][1]; // XXX not safe
                var trackname = me.track_name(j);
                $('<input type="checkbox" class="cbtrack" id="cbp' +
                  group_instance + '_' + track_id +
                  '" value="' + track_id + '_' + membership_id + '">' + 
                  '<label for="cbp' + group_instance + '_' + track_id +
                  '">' + trackname + ' <small>(' + me.membershipname[membership_id] +
                  ')</small></label><div style="float:right">' +
                  '<div class="ui-icon ui-icon-trash delgrouparg" ' +
                  'id="grouparg_' + group_instance + '_' + track_id +
                  '" title="delete this track"></div></div><br>')
                    .appendTo(group);
            }
        }
        me.update_checkboxes();
    }

    this.draw_data = function() {
        $.getJSON('/server/getgroupannotationsforjob/' + me.job.jobid, function(data) {
            if (data.length > 0) {
                me.groups.data = data;
                me.draw_my_data();
            }
        });
    }
    
    this.setup();
}

function GroupCollection(player, job) {
    var me = this;
    this.player = player;
    this.job = job;
    this.data = [];
    this.deleted = [];

    this.new_group = function(group_id) {
        var idx = me.data.length;
        me.data.push({
            group: parseInt(group_id),
            annotations: {}
        });
        return idx;
    }

    this.remove_group = function (idx) {
        me.data[idx] = null;
    };

    this.add_track = function(idx, track_id) {
        if (track_id in me.data[idx]['annotations']) {
            return false;
        }
        me.data[idx]['annotations'][track_id] = [];
        return true;
    }

    this.remove_track = function(track_id) {
        for (var group_id in me.data) {
            if (me.data[group_id]['annotations'].hasOwnProperty(track_id)) {
                delete me.data[group_id]['annotations'][track_id];
            }
        }
        me.deleted.push(parseInt(track_id));
    };

    this.remove_track_for_group = function (track_id, group_id) {
        if (me.data[group_id]['annotations'].hasOwnProperty(track_id)) {
            delete me.data[group_id]['annotations'][track_id];
        }
    }

    this.add_annotation = function(idx, track_id, frame, membership_id, value) {
        var annotations = me.data[idx]['annotations'][track_id];
        for (var i in annotations) {
            var f = annotations[i][0];
            if (f >= frame) {
                annotations.splice(i);
                break;
            }
        }
        annotations.push([frame, parseInt(membership_id), value]);
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
        var data = [];
        for (var group_id in me.data) {
            var group = me.data[group_id];
            if (!group) continue;
            var group2 = {};
            group2['group'] = group['group'];
            group2['annotations'] = {};
            for (var tid in group['annotations']) {
                var ntid = parseInt(tid);
                var ntid2 = ntid;
                for (var i in me.deleted) {
                    if (ntid > me.deleted[i]) {
                        ntid2 -= 1;
                    }
                }
                group2['annotations'][ntid2.toString()] = group['annotations'][tid];
            }
            data.push(group2);
        }
        return JSON.stringify(data);
    };
}
