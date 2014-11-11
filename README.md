pywb-hypothes.is
================

This project is an experiment to use the live rewriting capabilities and banner injection capabilities of [pywb web replay system](https://github.com/ikreymer/pywb) to automatically add [hypothes.is](https://hypothes.is) annotations to any web pages.

Currently, to see hypothes.is annotations, the user has to manually install a plugin or enable the annotations via a bookmark.

This project is a proof-of-concept of using a web replay rewriter for automatically showing annotations. This means the annotations should (in theory) work on any modern browser and do not require the
user to make any modifications. It would also for sharing links to pages with annotations enabled.

Currently this is a very early stage proof-of-concept using latest dev pywb.

Hosted at: http://pywb-hypothesis.herokuapp.com/

Some examples:

[https://pywb-hypothesis.herokuapp.com/h/http://hypothes.is/](https://pywb-hypothesis.herokuapp.com/h/http://hypothes.is/)

[https://pywb-hypothesis.herokuapp.com/h/http://www.autodidacts.io/openbci-brain-basics-neurons-structure-and-biology/](https://pywb-hypothesis.herokuapp.com/h/http://www.autodidacts.io/openbci-brain-basics-neurons-structure-and-biology/)
