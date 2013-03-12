(function() {
  var Commit, Diff, Head, Ref, Repo, Status, Tag, Tree, cmd, _, _ref;

  _ = require('underscore');

  cmd = require('./git');

  Commit = require('./commit');

  Tree = require('./tree');

  Diff = require('./diff');

  Tag = require('./tag');

  Status = require('./status');

  _ref = require('./ref'), Ref = _ref.Ref, Head = _ref.Head;

  module.exports = Repo = (function() {

    function Repo(path, bare) {
      this.path = path;
      this.bare = bare;
      if (this.bare) {
        this.dot_git = this.path;
      } else {
        this.dot_git = "" + this.path + "/.git";
      }
      this.git = cmd(this.path, this.dot_git);
    }

    Repo.prototype.commits = function(start, limit, skip, callback) {
      var _ref1, _ref2, _ref3;
      if (!callback) {
        _ref1 = [callback, skip], skip = _ref1[0], callback = _ref1[1];
      }
      if (!callback) {
        _ref2 = [callback, limit], limit = _ref2[0], callback = _ref2[1];
      }
      if (!callback) {
        _ref3 = [callback, start], start = _ref3[0], callback = _ref3[1];
      }
      if (!callback) {
        throw new Error("a callback is required");
      }
      if (start == null) {
        start = "master";
      }
      if (limit == null) {
        limit = 10;
      }
      if (skip == null) {
        skip = 0;
      }
      return Commit.find_all(this, start, {
        "max-count": limit,
        skip: skip
      }, callback);
    };

    Repo.prototype.tree = function(treeish) {
      if (treeish == null) {
        treeish = "master";
      }
      return new Tree(this, treeish);
    };

    Repo.prototype.diff = function(commitA, commitB, paths, callback) {
      var _ref1,
        _this = this;
      if (!callback) {
        _ref1 = [paths, callback], callback = _ref1[0], paths = _ref1[1];
      }
      if (paths == null) {
        paths = [];
      }
      if (_.isObject(commitA)) {
        commitA = commitA.id;
      }
      if (_.isObject(commitB)) {
        commitB = commitB.id;
      }
      return this.git("diff", {}, _.flatten([commitA, commitB, "--", paths]), function(err, stdout, stderr) {
        if (err) {
          return callback(err);
        }
        return callback(err, Diff.parse(_this, stdout));
      });
    };

    Repo.prototype.remotes = function(callback) {
      return Ref.find_all(this, "remote", Ref, callback);
    };

    Repo.prototype.remote_list = function(callback) {
      return this.git.list_remotes(callback);
    };

    Repo.prototype.remote_add = function(name, url, callback) {
      return this.git("remote", {}, ["add", name, url], function(err, stdout, stderr) {
        return callback(err);
      });
    };

    Repo.prototype.remote_fetch = function(name, callback) {
      return this.git("fetch", {}, name, function(err, stdout, stderr) {
        return callback(err);
      });
    };

    Repo.prototype.merge = function(name, callback) {
      return this.git("merge", {}, name, function(err, stdout, stderr) {
        return callback(err);
      });
    };

    Repo.prototype.status = function(callback) {
      return Status(this, callback);
    };

    Repo.prototype.tags = function(callback) {
      return Tag.find_all(this, callback);
    };

    Repo.prototype.create_tag = function(name, options, callback) {
      var _ref1;
      if (!callback) {
        _ref1 = [callback, options], options = _ref1[0], callback = _ref1[1];
      }
      return this.git("tag", options, [name], callback);
    };

    Repo.prototype.delete_tag = function(name, callback) {
      return this.git("tag", {
        d: name
      }, callback);
    };

    Repo.prototype.branches = function(callback) {
      return Head.find_all(this, callback);
    };

    Repo.prototype.create_branch = function(name, callback) {
      return this.git("branch", {}, name, function(err, stdout, stderr) {
        return callback(err);
      });
    };

    Repo.prototype.delete_branch = function(name, callback) {
      return this.git("branch", {
        d: true
      }, name, function(err, stdout, stderr) {
        return callback(err);
      });
    };

    Repo.prototype.branch = function(name, callback) {
      var _ref1;
      if (!callback) {
        _ref1 = [callback, name], name = _ref1[0], callback = _ref1[1];
      }
      if (!name) {
        return Head.current(this, callback);
      } else {
        return this.branches(function(err, heads) {
          var head, _i, _len;
          if (err) {
            return callback(err);
          }
          for (_i = 0, _len = heads.length; _i < _len; _i++) {
            head = heads[_i];
            if (head.name === name) {
              return callback(null, head);
            }
          }
          return callback(new Error("No branch named '" + name + "' found"));
        });
      }
    };

    Repo.prototype.checkout = function(treeish, callback) {
      return this.git("checkout", {}, treeish, callback);
    };

    Repo.prototype.commit = function(message, options, callback) {
      var _ref1;
      if (!callback) {
        _ref1 = [callback, options], options = _ref1[0], callback = _ref1[1];
      }
      if (options == null) {
        options = {};
      }
      options = _.extend(options, {
        m: "'" + message + "'"
      });
      return this.git("commit", options, function(err, stdout, stderr) {
        return callback(err);
      });
    };

    Repo.prototype.add = function(files, callback) {
      if (_.isString(files)) {
        files = [files];
      }
      return this.git("add", {}, files, callback);
    };

    Repo.prototype.remove = function(files, callback) {
      if (_.isString(files)) {
        files = [files];
      }
      return this.git("rm", {}, files, callback);
    };

    Repo.prototype.revert = function(sha, callback) {
      return this.git("revert", {}, sha, callback);
    };

    Repo.prototype.sync = function(branch, callback) {
      var _ref1,
        _this = this;
      if (!callback) {
        _ref1 = [branch, []], callback = _ref1[0], branch = _ref1[1];
      }
      return this.git("stash", {}, ["save"], function(err) {
        if (err) {
          return callback(err);
        }
        return _this.git("pull", {}, branch, function(err) {
          if (err) {
            return callback(err);
          }
          return _this.git("push", function(err) {
            if (err) {
              return callback(err);
            }
            return _this.git("stash", {}, "pop", function(err) {
              if (err) {
                return callback(err);
              }
              return callback(null);
            });
          });
        });
      });
    };

    return Repo;

  })();

}).call(this);