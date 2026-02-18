# About

This provides an interactive playground for the [Realizable, Reconfigurable, Unobtrusive Unit (R2U2)](https://github.com/R2U2/r2u2).

More information on the playground is available in our FMCAD 2025 tool paper: [R2U2 Playground: Visualization of a Real-time, Temporal Logic Runtime Monitor](https://par.nsf.gov/servlets/purl/10663732).

# Requirements
 * Git
 * Docker

# Running R2U2 Playground

1.) Clone repo with `git clone --recursive https://github.com/R2U2/r2u2_playground.git`

2.) Navigate inside this directory and run `docker compose -f docker-compose.yml up`

3.) Once the Docker image is built and running, navigate to localhost:80 in a browser

4.) If you make any changes to the playground, run `docker compose -f docker-compose.yml build`, followed by `docker compose -f docker-compose.yml up` to apply the changes.

Note: R2U2 requires its own internal memory to properly monitor specifications. The default values are given in backend/.cargo/config.toml, but users can increase the size of R2U2 further (if needed) by changing these values and rerunning `docker compose -f docker-compose.yml build`

## License

Licensed under Creative Commons Attribution 4.0 International License, (https://creativecommons.org/licenses/by/4.0/)
