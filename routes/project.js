require('rootpath')();
var logger = require('config/winston');

var express = require('express');
var router = express.Router();
var projectController = require("app/controllers/project_controller");

var Project = require('app/models/project');

verifyUserOwnsProject = function(req, res, next) {
	Project.findById(req.params.id, function(err, proj) {
		if(err || proj === null) { return res.send("Error: Project does not exist")}
		if(!proj.projectCreatedByUser(req.user._id)) return res.send("Error: user does not own project");
		next();		
	});
}

verifyUserInProject = function(req, res, next) {


	Project.findById(req.params.id, function(err, proj) {

		console.log(req.user._id, proj.user_ids.active)
		//console.log(err, proj);
		if(err || proj === null) { return res.send("Error: Project does not exist")}
		if(!proj.projectHasUser(req.user._id)) return res.send("Error: user does not belong to project");
		next();
	});
}

router.get('/', projectController.getProjects);
//router.get('/joined', projectController.getProjects);



//router.get('/',            projectController.index);



router.get('/:id',         verifyUserInProject, projectController.getProjectDetails);
//router.get('/:id/tagging', verifyUserInProject, projectController.tagging);
//router.get('/:id/tagging', verifyUserInProject, projectController.tagging);





router.get('/:id/tagging/getDocumentGroup', verifyUserInProject, projectController.getDocumentGroup);

router.get('/:id/curation', verifyUserInProject, projectController.getCurationDocument);
//router.get('/:id/tagging/getDocumentGroup', verifyUserInProject, projectController.getDocumentGroup);
//router.get('/:id/tagging/getPreviouslyAnnotatedDocumentGroup', verifyUserInProject, projectController.getDocumentGroup2);

router.post('/:id/tagging/modify_hierarchy', verifyUserInProject, projectController.modifyHierarchy);

router.post('/:id/tagging/submitAnnotations', verifyUserInProject, projectController.submitAnnotations);
router.get('/:id/download_annotations/:user_id', verifyUserOwnsProject, projectController.downloadAnnotationsOfUser);
router.get('/:id/download_combined_annotations', verifyUserOwnsProject, projectController.downloadCombinedAnnotations);


router.post('/:id/comments/submit', verifyUserInProject, projectController.submitComment);

router.post('/invitations/:id/accept', projectController.acceptInvitation);
router.post('/invitations/:id/decline', projectController.declineInvitation);

module.exports = router;