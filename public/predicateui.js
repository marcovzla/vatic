function PredicateUI(newpredbutton, newpreddialog, videoframe, job, player, predicates) {
    var me = this;
    this.newpredbutton = newpredbutton;
    this.newpreddialog = newpreddialog;
    
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
			title: 'Select the kind of predicate',
			buttons: {
			    OK: function() {
			        this.dialog('close');
			    },
			    Cancel: function() {
			        this.dialog('close');
			    }
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
