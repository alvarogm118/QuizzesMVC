const Sequelize = require("sequelize");
const {
    models
} = require("../models");


// Autoload the tip with id equals to :tipId
exports.load = (req, res, next, tipId) => {

    models.tip.findByPk(tipId, {
        include: [{
            model: models.user,
            as: 'author'
        }]
    })
        .then(tip => {
            if (tip) {
                req.tip = tip;
                next();
            } else {
                next(new Error('There is no tip with tipId=' + tipId));
            }
        })
        .catch(error => next(error));
};

// MW that allows actions only if the user logged in is admin or is the author of the quiz. (Como el de quiz.js)
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin = !!req.session.user.isAdmin;
    const isAuthor = req.tip.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};


// POST /quizzes/:quizId/tips
exports.create = (req, res, next) => {

    const tip = models.tip.build({
        text: req.body.text,
        quizId: req.quiz.id,
        authorId: req.session.user.id
    });

    tip.save()
        .then(tip => {
            req.flash('success', 'Tip created successfully.');
            res.redirect("back");
        })
        .catch(Sequelize.ValidationError, error => {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({
                                      message
                                  }) => req.flash('error', message));
            res.redirect("back");
        })
        .catch(error => {
            req.flash('error', 'Error creating the new tip: ' + error.message);
            next(error);
        });
};


// GET /quizzes/:quizId/tips/:tipId/accept
exports.accept = (req, res, next) => {

    const {
        tip
    } = req;

    tip.accepted = true;

    tip.save(["accepted"])
        .then(tip => {
            req.flash('success', 'Tip accepted successfully.');
            res.redirect('/quizzes/' + req.params.quizId);
        })
        .catch(error => {
            req.flash('error', 'Error accepting the tip: ' + error.message);
            next(error);
        });
};


// DELETE /quizzes/:quizId/tips/:tipId
exports.destroy = (req, res, next) => {

    req.tip.destroy()
        .then(() => {
            req.flash('success', 'tip deleted successfully.');
            res.redirect('/quizzes/' + req.params.quizId);
        })
        .catch(error => next(error));
};

// GET /quizzes/:quizId/tips/:tipId
exports.edit = (req, res, next) => {

    const {
        tip,
        quiz
    } = req;

    res.render('tips/edit', {
        quiz,
        tip
    })
};

// PUT /quizzes/:quizId/tips/:tipId/edit
exports.update = (req, res, next) => {
    const {
        quiz,
        tip,
        body
    } = req;

    tip.text = body.text;
    tip.accepted = false;

    tip.save({
        fields: ["text", "accepted"]
    }) //es una promesa el metodo de .save en la BBDD.
        .then(tip => {
            req.flash('success', 'Tip edited successfully.');
            res.redirect("/goback");
        })
        .catch(Sequelize.ValidationError, error => {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({
                                      message
                                  }) => req.flash('error', message));
            res.render("tips/edit", {
                quiz,
                tip
            });
        })
        .catch(error => {
            req.flash('error', 'Error editing the tip: ' + error.message);
            next(error);
        });
};