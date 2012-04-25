import turkic.database
import turkic.models
from sqlalchemy import Column, Integer, Float, String, Boolean, Text
from sqlalchemy import ForeignKey, Table, PickleType
from sqlalchemy.orm import relationship, backref
import Image
import vision
from vision.track.interpolation import LinearFill
import random
import logging

logger = logging.getLogger("vatic.models")

boxes_attributes = Table("boxes2attributes", turkic.database.Base.metadata,
    Column("box_id", Integer, ForeignKey("boxes.id")),
    Column("attribute_id", Integer, ForeignKey("attributes.id")))

class Video(turkic.database.Base):
    __tablename__   = "videos"

    id              = Column(Integer, primary_key = True)
    slug            = Column(String(250), index = True)
    width           = Column(Integer)
    height          = Column(Integer)
    totalframes     = Column(Integer)
    location        = Column(String(250))
    skip            = Column(Integer, default = 0, nullable = False)
    perobjectbonus  = Column(Float, default = 0)
    completionbonus = Column(Float, default = 0)
    trainwithid     = Column(Integer, ForeignKey(id))
    trainwith       = relationship("Video", remote_side = id)
    isfortraining   = Column(Boolean, default = False)
    trainvalidator  = Column(PickleType, nullable = True, default = None)
    blowradius      = Column(Integer, default = 5)

    def __getitem__(self, frame):
        path = Video.getframepath(frame, self.location)
        return Image.open(path)

    @classmethod
    def getframepath(cls, frame, base = None):
        l1 = frame / 10000
        l2 = frame / 100
        path = "{0}/{1}/{2}.jpg".format(l1, l2, frame)
        if base is not None:
            path = "{0}/{1}".format(base, path)
        return path

class Label(turkic.database.Base):
    __tablename__ = "labels"

    id = Column(Integer, primary_key = True)
    text = Column(String(250))
    videoid = Column(Integer, ForeignKey(Video.id))
    video = relationship(Video, backref = backref("labels",
                                                  cascade = "all,delete"))

class Attribute(turkic.database.Base):
    __tablename__ = "attributes"

    id = Column(Integer, primary_key = True)
    text = Column(String(250))
    labelid = Column(Integer, ForeignKey(Label.id))
    label = relationship(Label, backref = backref("attributes",
                                                  cascade = "all,delete"))

    def __str__(self):
        return self.text

class Segment(turkic.database.Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key = True)
    videoid = Column(Integer, ForeignKey(Video.id))
    video = relationship(Video, backref = backref("segments",
                                                  cascade = "all,delete"))
    start = Column(Integer)
    stop = Column(Integer)

    @property
    def paths(self):
        paths = []
        for job in self.jobs:
            if job.useful:
                paths.extend(job.paths)
        return paths

class Job(turkic.models.HIT):
    __tablename__ = "jobs"
    __mapper_args__ = {"polymorphic_identity": "jobs"}

    id             = Column(Integer, ForeignKey(turkic.models.HIT.id),
                            primary_key = True)
    segmentid      = Column(Integer, ForeignKey(Segment.id))
    segment        = relationship(Segment,
                                  backref = backref("jobs",
                                                    cascade = "all,delete"))
    istraining     = Column(Boolean, default = False)

    def getpage(self):
        return "?id={0}".format(self.id)

    def markastraining(self):
        """
        Marks this job as the result of a training run. This will automatically
        swap this job over to the training video and produce a replacement.
        """
        replacement = Job(segment = self.segment, group = self.group)
        self.segment = self.segment.video.trainwith.segments[0]
        self.group = self.segment.jobs[0].group
        self.istraining = True

        logger.debug("Job is now training and replacement built")

        return replacement

    def invalidate(self):
        """
        Invalidates this path because it is poor work. The new job will be
        respawned automatically for different workers to complete.
        """
        self.useful = False
        # is this a training task? if yes, we don't want to respawn
        if not self.istraining:
            return Job(segment = self.segment, group = self.group)

    @property
    def trainingjob(self):
        return self.segment.video.trainwith.segments[0].jobs[0]

    @property
    def validator(self):
        return self.segment.video.trainvalidator

    def __iter__(self):
        return self.paths

class Path(turkic.database.Base):
    __tablename__ = "paths"
    
    id = Column(Integer, primary_key = True)
    jobid = Column(Integer, ForeignKey(Job.id))
    job = relationship(Job, backref = backref("paths", cascade="all,delete"))
    labelid = Column(Integer, ForeignKey(Label.id))
    label = relationship(Label, cascade = "none", backref = "paths")

    interpolatecache = None

    def getboxes(self, interpolate = False, bind = False, label = False):
        result = [x.getbox() for x in self.boxes]
        result.sort(key = lambda x: x.frame)
        if interpolate:
            if not self.interpolatecache:
                self.interpolatecache = LinearFill(result)
            result = self.interpolatecache

        if bind:
            result = Path.bindattributes(self.attributes, result)

        if label:
            for box in result:
                box.attributes.insert(0, self.label.text)

        return result

    @classmethod 
    def bindattributes(cls, attributes, boxes):
        attributes = sorted(attributes, key = lambda x: x.frame)

        byid = {}
        for attribute in attributes:
            if attribute.attributeid not in byid:
                byid[attribute.attributeid] = []
            byid[attribute.attributeid].append(attribute)

        for attributes in byid.values():
            for prev, cur in zip(attributes, attributes[1:]):
                if prev.value:
                    for box in boxes:
                        if prev.frame <= box.frame < cur.frame:
                            if prev.attribute not in box.attributes:
                                box.attributes.append(prev.attribute)
            last = attributes[-1]
            if last.value:
                for box in boxes:
                    if last.frame <= box.frame:
                        if last.attribute not in box.attributes:
                            box.attributes.append(last.attribute)

        return boxes
    
    @classmethod 
    def bindpredicates(cls, predicate_annotations, boxes):        
        predicate_annotations = sorted(predicate_annotations, key = lambda x: x.predicateinstanceid)
        predicate_annotations = sorted(predicate_annotations, key = lambda x: x.predicateinstance.predicate.text)
        predicate_annotations = sorted(predicate_annotations, key = lambda x: x.frame)

        byid = {}
        for pa in predicate_annotations:
            if pa.predicateinstanceid not in byid:
                byid[pa.predicateinstanceid] = []
            byid[pa.predicateinstanceid].append(pa)

        for pas in byid.values():
            for prev, cur in zip(pas, pas[1:]):
                if prev.value:
                    for box in boxes:
                        if prev.frame <= box.frame < cur.frame:
                            if prev not in box.attributes:
                                box.attributes.append(prev)
            last = pas[-1]
            if last.value:
                for box in boxes:
                    if last.frame <= box.frame:
                        if last not in box.attributes:
                            box.attributes.append(last)

        return boxes

    def __repr__(self):
        return "<Path {0}>".format(self.id)

class AttributeAnnotation(turkic.database.Base):
    __tablename__ = "attribute_annotations"

    id = Column(Integer, primary_key = True)
    pathid = Column(Integer, ForeignKey(Path.id))
    path = relationship(Path,
                        backref = backref("attributes",
                                          cascade = "all,delete"))
    attributeid = Column(Integer, ForeignKey(Attribute.id))
    attribute = relationship(Attribute)
    frame = Column(Integer)
    value = Column(Boolean, default = False)

    def __repr__(self):
        return ("AttributeAnnotation(pathid = {0}, "
                                    "attributeid = {1}, "
                                    "frame = {2}, "
                                    "value = {3})").format(self.pathid,
                                                           self.attributeid,
                                                           self.frame,
                                                           self.value)

class Box(turkic.database.Base):
    __tablename__ = "boxes"

    id = Column(Integer, primary_key = True)
    pathid = Column(Integer, ForeignKey(Path.id))
    path = relationship(Path,
                        backref = backref("boxes", cascade = "all,delete"))
    xtl = Column(Integer)
    ytl = Column(Integer)
    xbr = Column(Integer)
    ybr = Column(Integer)
    frame = Column(Integer)
    occluded = Column(Boolean, default = False)
    outside = Column(Boolean, default = False)

    def getbox(self):
        return vision.Box(self.xtl, self.ytl, self.xbr, self.ybr,
                          self.frame, self.outside, self.occluded, 0)

class PerObjectBonus(turkic.models.BonusSchedule):
    __tablename__ = "per_object_bonuses"
    __mapper_args__ = {"polymorphic_identity": "per_object_bonuses"}

    id = Column(Integer, ForeignKey(turkic.models.BonusSchedule.id), 
        primary_key = True)
    amount = Column(Float, default = 0.0, nullable = False)

    def description(self):
        return (self.amount, "per object")

    def award(self, hit):
        paths = len(hit.paths)
        amount = paths * self.amount
        if amount > 0:
            hit.awardbonus(amount, "For {0} objects".format(paths))
            logger.debug("Awarded per-object bonus of ${0:.2f} for {1} paths"
                            .format(amount, paths))
        else:
            logger.debug("No award for per-object bonus because 0 paths")

class CompletionBonus(turkic.models.BonusSchedule):
    __tablename__ = "completion_bonuses"
    __mapper_args__ = {"polymorphic_identity": "completion_bonuses"}

    id = Column(Integer, ForeignKey(turkic.models.BonusSchedule.id),
        primary_key = True)
    amount = Column(Float, default = 0.0, nullable = False)

    def description(self):
        return (self.amount, "if complete")

    def award(self, hit):
        hit.awardbonus(self.amount, "For complete annotation.")
        logger.debug("Awarded completion bonus of ${0:.2f}"
                        .format(self.amount))

class Role(turkic.database.Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    text = Column(String(250))
    jobid = Column(Integer, ForeignKey(Job.id))
    job = relationship(Job, backref=backref('roles',
                                            cascade='all,delete'))
    
    def __str__(self):
        return self.text

class Predicate(turkic.database.Base):
    __tablename__ = "predicates"

    id = Column(Integer, primary_key=True)
    text = Column(String(250))
    jobid = Column(Integer, ForeignKey(Job.id))
    job = relationship(Job, backref=backref('predicates',
                                            cascade='all,delete'))
    
    def __str__(self):
        return self.text

class PredicateInstance(turkic.database.Base):
    __tablename__ = "predicate_instances"

    id = Column(Integer, primary_key = True)
    predicateid = Column(Integer, ForeignKey(Predicate.id))
    predicate = relationship(Predicate, backref = backref("predicate_instances",
                                                  cascade = "all,delete"))
    jobid = Column(Integer, ForeignKey(Job.id))
    job = relationship(Job, backref = backref("predicate_instances", cascade="all,delete"))
    
    def getuniquepaths(self):
        pathids = []
        paths = []
        for pa in self.predicate_annotations:
            if (pa.pathid in pathids):
                continue
            else:
                pathids.append(pa.pathid)
                paths.append(pa.path)
        return paths

    def __str__(self):
        return '{0}#{1}'.format(self.predicate, self.id)
    
class PredicateAnnotation(turkic.database.Base):
    __tablename__ = "predicate_annotations"
    
    id = Column(Integer, primary_key = True)
    predicateinstanceid = Column(Integer, ForeignKey(PredicateInstance.id))
    predicateinstance = relationship(PredicateInstance, backref = backref("predicate_annotations",
                                                                          cascade = "all,delete"))
    pathid = Column(Integer, ForeignKey(Path.id))
    path = relationship(Path, backref = backref("predicate_annotations",
                                                cascade = "all,delete"))
    roleid = Column(Integer, ForeignKey(Role.id))
    role = relationship(Role, backref = backref("predicate_annotations",
                                                cascade = "all,delete"))
    frame = Column(Integer)
    value = Column(Boolean, default = False)

    def __str__(self):
        return '{0}:{1}'.format(self.predicateinstance, self.role)

class Sentence(turkic.database.Base):
    __tablename__ = 'sentences'

    id = Column(Integer, primary_key=True)
    jobid = Column(Integer, ForeignKey(Job.id))
    job = relationship(Job, backref=backref('sentences',
                                            cascade='all,delete'))
    text = Column(Text)

    def __str(self):
        return '<{}: {}>'.format(self.job, self.text)

class SentenceAnnotation(turkic.database.Base):
    __tablename__ = 'sentence_annotations'

    id = Column(Integer, primary_key=True)
    sentenceid = Column(Integer, ForeignKey(Sentence.id))
    sentence = relationship(Sentence, backref=backref('annotations',
                                                      cascade='all,delete'))
    frame = Column(Integer)
    value = Column(Boolean, default=False)

    def __str__(self):
        return '<{}: {} {}>'.format(self.sentence, self.frame, self.value)

# added to handle groups and memberships
class Membership(turkic.database.Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True)
    text = Column(String(250))
    jobid = Column(Integer, ForeignKey(Job.id))
    job = relationship(Job, backref=backref('memberships',
                                            cascade='all,delete'))

    def __str__(self):
        return self.text

class GroupClass(turkic.database.Base):
    __tablename__ = "group_classes"

    id = Column(Integer, primary_key=True)
    text = Column(String(250))
    jobid = Column(Integer, ForeignKey(Job.id))
    job = relationship(Job, backref=backref('group_classes',
                                            cascade='all,delete'))

    def __str__(self):
        return self.text

class GroupInstance(turkic.database.Base):
    __tablename__ = "group_instances"

    id = Column(Integer, primary_key=True)
    groupclassid = Column(Integer, ForeignKey(GroupClass.id))
    groupclass = relationship(GroupClass, backref=backref("group_instances",
                                                         cascade="all,delete"))
    jobid = Column(Integer, ForeignKey(Job.id))
    job = relationship(Job, backref=backref("group_instances", cascade="all,delete"))

    def getuniquepaths(self):
        pathids = []
        paths = []
        for ga in self.group_annotations:
            if ga.pathid in pathids:
                continue
            else:
                pathids.append(ga.pathid)
                paths.append(ga.path)
        return paths

    def __str__(self):
        return '{0}#{1}'.format(self.groupclass, self.id)

class GroupAnnotation(turkic.database.Base):
    __tablename__ = "group_annotations"

    id = Column(Integer, primary_key=True)
    groupinstanceid = Column(Integer, ForeignKey(GroupInstance.id))
    groupinstance = relationship(GroupInstance, backref=backref("group_annotations",
                                                                cascade="all,delete"))
    pathid = Column(Integer, ForeignKey(Path.id))
    path = relationship(Path, backref=backref("group_annotations",
                                              cascade="all,delete"))
    membershipid = Column(Integer, ForeignKey(Membership.id))
    membership = relationship(Membership, backref=backref("group_annotations",
                                                          cascade="all,delete"))
    frame = Column(Integer)
    value = Column(Boolean, default=False)

    def __str__(self):
        return '{0}:{1}'.format(self.groupinstance, self.role)
