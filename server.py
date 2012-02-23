import os.path, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import config
from turkic.server import handler, application
from turkic.database import session
import cStringIO
from models import *

import logging
logger = logging.getLogger("vatic.server")

@handler()
def getjob(id, verified):
    job = session.query(Job).get(id)

    logger.debug("Found job {0}".format(job.id))

    if int(verified) and job.segment.video.trainwith:
        # swap segment with the training segment
        training = True
        segment = job.segment.video.trainwith.segments[0]
        logger.debug("Swapping actual segment with training segment")
    else:
        training = False
        segment = job.segment

    video = segment.video
    labels = dict((l.id, l.text) for l in video.labels)

    attributes = {}
    for label in video.labels:
        attributes[label.id] = dict((a.id, a.text) for a in label.attributes)

    roles = dict((r.id, r.text) for r in session.query(Role))
    predicates = dict((p.id, p.text) for p in session.query(Predicate))

    logger.debug("Giving user frames {1} to {2} of {0}".format(video.slug,
                                                               segment.start,
                                                               segment.stop))

    return {"start":        segment.start,
            "stop":         segment.stop,
            "slug":         video.slug,
            "width":        video.width,
            "height":       video.height,
            "skip":         video.skip,
            "perobject":    video.perobjectbonus,
            "completion":   video.completionbonus,
            "blowradius":   video.blowradius,
            "jobid":        job.id,
            "training":     int(training),
            "labels":       labels,
            "attributes":   attributes,
            "roles":        roles,
            "predicates":   predicates}

@handler()
def getboxesforjob(id):
    job = session.query(Job).get(id)
    result = []
    for path in job.paths:
        attrs = [(x.attributeid, x.frame, x.value) for x in path.attributes]
        result.append({"label": path.labelid,
                       "boxes": [tuple(x) for x in path.getboxes()],
                       "attributes": attrs})
    return result

@handler()
def getpredicateannotationsforjob(id):
    job = session.query(Job).get(id)
    result = []
    for pi in job.predicate_instances:
        sorted_annotations = sorted(pi.predicate_annotations, key = lambda x: x.frame)
        annotations = {}
        for pa in sorted_annotations:
            a = (pa.frame, pa.roleid, pa.value)
            if (annotations.has_key(pa.pathid)):
                annotations[pa.pathid].appends(a)
            else:
                annotations[pa.pathid] = [a]
        result.append({"predicate": pi.predicateid,
                       "annotations": annotations })
    return result

def readpaths(tracks):
    paths = []
    logger.debug("Reading {0} total tracks".format(len(tracks)))

    for label, track, attributes in tracks:
        path = Path()
        path.label = session.query(Label).get(label)
        
        logger.debug("Received a {0} track".format(path.label.text))

        for frame, userbox in track.items():
            box = Box(path = path)
            box.xtl = max(int(userbox[0]), 0)
            box.ytl = max(int(userbox[1]), 0)
            box.xbr = max(int(userbox[2]), 0)
            box.ybr = max(int(userbox[3]), 0)
            box.occluded = int(userbox[4])
            box.outside = int(userbox[5])
            box.frame = int(frame)

            logger.debug("Received box {0}".format(str(box.getbox())))

        for attributeid, timeline in attributes.items():
            attribute = session.query(Attribute).get(attributeid)
            for frame, value in timeline.items():
                aa = AttributeAnnotation()
                aa.attribute = attribute
                aa.frame = frame
                aa.value = value
                path.attributes.append(aa)

        paths.append(path)
    return paths
  
def readpredicates(predicates, paths):
    predicateInstances = []
    logger.debug("Reading {0} total predicate instances".format(len(predicates)))
    
    for p in predicates:
        pi = PredicateInstance()
        pi.predicate = session.query(Predicate).get(int(p['predicate']))
        
        for pathid in p['annotations'].keys():
            path = paths[int(pathid)]
            for frame, roleid, value in p['annotations'][pathid]:
                pa = PredicateAnnotation()
                pa.predicateinstance = pi
                pa.path = path
                pa.role = session.query(Role).get(roleid)
                pa.frame = frame
                pa.value = value
                
        predicateInstances.append(pi)
        
    return predicateInstances
    
@handler(post = "json")
def savejob(id, data):
    job = session.query(Job).get(id)

    for path in job.paths:
        session.delete(path)
    for pi in job.predicate_instances:
        for pa in pi.predicate_annotations:
            session.delete(pa)
        session.delete(pi)
    session.commit()
    
    paths = readpaths(data["tracks"])
    for path in paths:
        job.paths.append(path)
    for pi in readpredicates(data["predicates"], paths):
        job.predicate_instances.append(pi)
    
    session.add(job)
    session.commit()

@handler(post = "json")
def validatejob(id, data):
    job = session.query(Job).get(id)
    paths = readpaths(data["tracks"])
    predicates = readpredicates(data["predicates"])

    return (job.trainingjob.validator(paths, job.trainingjob.paths) and
            job.trainingjob.validator(predicates, job.trainingjob.predicates))

@handler()
def respawnjob(id):
    job = session.query(Job).get(id)

    replacement = job.markastraining()
    job.worker.verified = True
    session.add(job)
    session.add(replacement)
    session.commit()

    replacement.publish()
    session.add(replacement)
    session.commit()
    
@handler()
def getpredicates():
    return [(p.id, p.text) for p in session.query(Predicate).all()]
    
@handler()
def getroles():
    return [(r.id, r.text) for r in session.query(Role).all()]
