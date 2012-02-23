function PredicateUI(newpredbutton, newpreddialog, predcontainer, videoframe, job, player, predicates) {
    var me = this;
    this.newpredbutton = newpredbutton;
    this.newpreddialog = newpreddialog;
    this.predcontainer = predcontainer;
    this.pred_by_id = {};
    
    this.setup = function() {
        this.newpredbutton.button({
            icons: {
                primary: "ui-icon-plusthick",
            },
            disabled: false
        }).click(function() {
            me.newpredicate();
        });
        
        this.newpreddialog.dialog({
            autoOpen: false,
			height: 300,
			width: 350,
			modal: true,
			resizable: false,
			title: 'create a predicate',
			buttons: {
			    OK: function() {
			        predicate_id = $('input[name="predicates"]:checked').val();
			        if (!predicate_id) {
			            alert('please select a predicate');
			            return;
			        }
			        var new_pred = $('<p>' + me.pred_by_id[predicate_id] + 
			                         ' ' + (me.predcontainer.children().length+1) + '</p>');
		            me.predcontainer.append(new_pred);
		            new_pred.effect('highlight', {}, 'slow');
			        $(this).dialog('close');
			    },
			    Cancel: function() {
			        $(this).dialog('close');
			    }
			}
        });
        
        $.getJSON('/server/getpredicates', function(data) {
            for (var p in data) {
                me.pred_by_id[data[p][0]] = data[p][1];
                me.newpreddialog.append('<input type="radio" name="predicates" id="' +
                    data[p][0] + '" value="' + data[p][0] + '"><label for="' +
                    data[p][0] + '">' + data[p][1] + '</label><br>');
            }
        });
    }
    
    this.newpredicate = function() {
        me.newpreddialog.dialog('open');
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
