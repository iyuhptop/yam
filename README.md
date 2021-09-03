# YAM
Yet Another Application Model - a simpler way to run your app on kubernetes

# Quick Start

```bash
# lifecycle
yam init team/app
yam plan --version --dir --clusters [--stages prepare(default is all) --no-diff]
yam apply --version --dir --clusters [--stages prepare --no-diff]
yam rollback team/app --rev 1/2 --clusters 
yaml remove team/app --clusters

# use customized model
yam configure --url --token

# tools
yam forward team/app --from-to 8080:8089 [--no-check]
yam ui
```

Bootstrap Kubernetes clusters with basic infrastructure components.
- Kube Prometheus Stack
- Ingress Controller and CertManager
- Istio System(optional)
- ClusterAutoScaler (optional)

# Workflow

Plan Stage:
1. connect YAM server if configured on cloud
2. load YAM definition locally, or remotely
3. validate local YAM definitions
4. diff with previous YAM and generate plan (if apiVersion is not same or --no-diff, perform complete plan) by DFS(deep first search, name as traverse key)
5. store the plan if configured locally (and on cloud)

Apply Stage:

1. execute plan stage again, based on the previous plan file on local (or on cloud) (check commit hash if in git context)
2. execute planed steps one by one, store the apply result locally (and on cloud)
3. execute YAM lifecycle hooks during certain sub-stage
4. check pod status until timeout or reaching ready state
5. report status if configured on cloud

# Plugin

1. define subset of json schema + handler, publish to npm registry
2. when it comes to run, merge json schema, handlers on same node will conflict
3. use the merged schema

# Comparison

### Compare to Helm

1. helm allows us to customize template, but it can not customize operation workflow and integrate with non-kubernetes systems
2. helm define environment related parameters in separate values file, it's not flexible enough, especially when there are many environments
3. helm expose not only values files but also templates definitions to developers and operators, it's not app centric, and platform can not perform aspect
4. when platform engineers want to upgrade Charts to all apps, they need to communicate with every team
5. helm can not validate the generated files util applying to kubernetes

### Compare to Kustomize

1. Kustomize also focus on template rendering rather than application lifecycle management
2. Kustomize also expose kubernetes details to end user

### Compare to Pulumi/Terraform

1. Pulumi/Terraform are more focused on IaC, they are designed for Platform Engineer, not for application developers/operators
2. YAM leverages Pulumi/Terraform, Platform Engineer could develop customized application model through these two awesome IaC platform, while only exposes simple Yaml towards application developer/operator side

### Compare to Open Application Model (OAM)

YAM is INSPIRED from OAM, while the implementation is Totally different from OAM runtime KubeVela or CrossPlane.

: JSON Schema + TypeScript !

YAM introduce two level environment definition: 'stack:envTag', while engTag is optional, cluster level dynamic values could be inherited from stack level, designed for large scale and multiple region deployment

Both are built for separation of concerns, both are app centric.
- Platform Engineer: how to provide an easy to use, scalable, stable, secure, cloud native platform?
- Dev: how to run, access, observe my app ?
- Ops: how to operate the app ?

Dev and Ops DO NOT want to learn every field meaning of K8S Resources and so many CRDs !

Differences:
- OAM is trait and workflow focused, while YAM is operation lifecycle focused. fill a few fields, then, it just works !
- OAM runtime KubeVela use Cuelang to define and validate the model, while YAM YAM glued plugins together in another programmable approach, use JSON Schema + TypeScript Functions. Yaml -> JSON Schema -> TypeScript Types
- OAM needs extra kubernetes CRD and runtime, YAM is a lightweight tool, on-prem or cloud console is optional
- YAM has a more flexible way of managing environment related parameters or variables.
- YAM is written by Node.js, release as npm package / single binary, lightweight, and, Totally Non-intrusive !
- YAM leverages existing languages: TypeScript for Platform Engineer, Yaml for Application Developer/Operator
- YAM leverages existing DevOps tech stack Holistically: Terraform/Pulumi/Helm/CRD Operators/..., could be easily integrated to ANY CI/CD system, also some KubeVela & CrossPlane components, like cloud providers, terraform controller
- YAM split operation workflow to two stages, plan & apply (inspired from terraform), also support direct apply mode.
- YAM has could send HTTP requests (and do anything you want) in plugins, make it easily integrating with other infrastructures, not only composing YAMLs.

# YAM is:
- From platform engineer perspective, it links IaaS(Terraform), Kubernetes CRD Operators, Helm Charts, Project Management Systems, ... all stuff, with the Application, defining a standardized workflow of Operating Cloud Services, expose it throw Streamlined, Concise, Extensible, Holistic Models
- From developer/operator perspective, they only need to fill in a few blanks defined by the Application Model. After a single line of command (executed automatically on any CI/CD systems), application magically works !

# Todo

- [] json schema merge and validation - yam-operator
- [] json diff - yam-operator
- [] write test cases at first - all
- [] implement kube client features - yam-operator
- [] develop core-plugins, split - plugins
- [] Plan file generate and persistance - yam-operator
- [] apply stage lock
- [] when binary plan mode, unzip the plan and run in tmp directory
- [] implement yam-cli