via.hypothes.is
================

This project uses the live web rewriting and banner injection capabilities of [pywb web replay system](https://github.com/ikreymer/pywb) to automatically add [hypothes.is](https://hypothes.is) annotations to any web pages.

(Previously, to see Hypothesis annotations, the user has to manually install a plugin or enable the annotations via a bookmarklet).

This project is a demonstration of of using a web replay rewriting system for automatically showing annotations, which allows the annotations to (in theory) work on any modern browser.

Hosted at: https://via.hypothes.is/

Some examples:

[https://via.hypothes.is/h/http://hypothes.is/](https://via.hypothes.is/h/http://hypothes.is/)

[https://via.hypothes.is/h/http://www.autodidacts.io/openbci-brain-basics-neurons-structure-and-biology/](https://via.hypothes.is/h/http://www.autodidacts.io/openbci-brain-basics-neurons-structure-and-biology/)


### Running Locally with Docker

Via now includes a Dockerfile to be more easily deployed in Docker.

To build the container:
```
docker build -t hypothesis/via .
```

To run the container afterwards:
```
docker run --name via -d -p 9080:9080 hypothesis/via
```

This will start a container on the Docker host, mapped to port 9080. 

To stop:

```
docker stop via
```
