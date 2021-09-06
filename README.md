# YAM

Yet Another Application Model(YAM) - A Simpler Way to Manage Applications on Kubernetes.

- [YAM](#yam)
  - [What's YAM](#whats-yam)
  - [Why YAM](#why-yam)
      - [Why separation of concerns is significant](#why-separation-of-concerns-is-significant)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Step 1. Install YAM-CLI](#step-1-install-yam-cli)
    - [Step 2. Generate Operation Boilerplate](#step-2-generate-operation-boilerplate)
    - [Step 3. Release the App](#step-3-release-the-app)
    - [Other Commands](#other-commands)
  - [Comparisons](#comparisons)
    - [Compare to Helm/Kustomize](#compare-to-helmkustomize)
    - [Compare to Pulumi/Terraform](#compare-to-pulumiterraform)
    - [Compare to Open Application Model (OAM)](#compare-to-open-application-model-oam)
      - [What YAM & OAM have in common](#what-yam--oam-have-in-common)
      - [What's the Differences](#whats-the-differences)
  - [Workflow](#workflow)
    - [Plugin Development](#plugin-development)
    - [Architecture](#architecture)

## What's YAM

**YAM is an flexible platform and framework**, to:
- allow platform engineers **defining** standardized application model to maintain operation metadata.
- allow developers/operators **describing** how to operate their cloud native apps with **a few lines of codes**.

## Why YAM

YAM is inspired from [Open Application Model](https://oam.dev/)(OAM), however, the implementation is **Totally** different from OAM runtime [KubeVela](https://github.com/oam-dev/kubevela). Here are some highlights of YAM.

- ☸ **Operation Lifecycle as Code, EVERYTHING as Code**.
- :ok_person: Focus on **separation of concerns**, **app-centric**, hiding the complexity of the platform.
- :blush: **Extremely easy to use**, it won't take you one minute to bring your application on Kubernetes.
- :zap: **Lightweight and Fast**, NO need for [CRDs](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) and [Operators](https://github.com/operator-framework)
- :sparkles: Extensible, YAM leverages JavaScript ecosystem to develop plugins to strengthen application model, by using JSON Schema, TypeScript, and Tons of NPM packages.

#### Why separation of concerns is significant

The concerns of different roles varies a lot:
- **Platform Engineer**: how to provide an easy to use, scalable, stable, secure, cloud native platform?
- **Developer**: how to run, access, observe my app ?
- **Operator**: how to operate the app, is capacity enough ?

**In traditional way**:
- Developers need to learn TOO MUCH platform related things to get onboard, like Kubernetes Resources, CRD, Helm, Cloud Services...
- Platform engineer loses control of running workloads when team grows.

**In YAM/OAM way**:
- From developer/operator's perspective, they only need to fill in a few blanks that **defined by the Application Model**, then, type ONE simple command(YAM - "yam apply" / OAM - "vela up"), the **whole app stack** magically works !
- From platform engineer's perspective, app-centric and standardized models LINK whole platform holistically. All complex things, like IaC, Kubernetes Resources and CRs, Helm Charts, are hidden for developers, but easily controlled by platform engineer team.

## Getting Started

### Prerequisites

Just a Kubernetes cluster, you could run one by [Minikube](https://minikube.sigs.k8s.io/docs/start/), [K3S](https://k3s.io/) or any Kubernetes cloud provider.

### Step 1. Install YAM-CLI

**Option1**. Download and Install binary executable

```bash
curl -sfL https://yam.plus/cli | sh -
# takes maybe 10 seconds
yam --version
```

**Option 2**. Install throw NPM

```bash
npm i @yam/cli -g
# takes maybe 5 seconds
yam --version
```

### Step 2. Generate Operation Boilerplate

The following command will generate a '.yam/app.yaml' file. '.yam' directory is for maintaining the **whole operation lifecycle**, as code.

```bash
yam init <your-team>/<your-app>
```

Fill a few fields of the YAM file, here is a complete example:

```yaml
schema: application/1.0
metadata:
  app: your-app
  namespace: your-team

# declare dependencies
prepare:
- type: redis
  name: my-app-cache
  size:
    cpu: 1
    memory: 128Mi

# declare app configs
config:
- type: configMap
  name: my-config
  mount: /path/to/config
  from: ["application.yml"]

# declare deploy metadata
deploy:
  type: deployment
  image: docker.io/your-org/your-app
  version: 1.0.0
  port: 8080
  replica: ~{ replica.num, 2 } # place holder for dynamic parameters
  healthCheck:
    url: /health

# declare access rules
access:
  route:
    host: some-domain.corp.com
    cert: your-cert
    port: 8080

# declare monitoring/alerting rules
observe:
  monitor:
    path: /metrics
  alert:
  - when: absent(process_uptime_seconds{service="your-app"})
    keep: 5s
    severity: critical
    description: "Service Unavailable !"

# declare auto-scaling rules
scale:
- type: metrics
  trigger: cpu
  threshold: 60%
  max: 10
  min: 2
```

### Step 3. Release the App

```bash
# 2. plan a release of your app, on a group of environments
yam plan --version v1.0.0 --clusters dev,qa
# 3. apply the changes previously planned
yam apply -f release-plan-<timestamp>.yam.bin

# or, plan-and-apply directly
yam apply --version v1.0.1 --clusters dev,qa
```

### Other Commands

Rollback or remove the app.

```bash
yam rollback team/app --rev 1/2 --clusters 
yaml remove team/app --clusters
```

Some built-in tools.

```bash
# port-forwarding tool
yam forward team/app --from-to 8080:8089

# portable UI
yam ui
```

## Comparisons

### Compare to Helm/Kustomize

Helm's limitations:
1. helm allows us to customize template, but it can not customize operation workflow and integrate with non-kubernetes systems
2. helm define environment related parameters in separate values file, it's not flexible enough, especially when there are many environments
3. helm expose not only values files but also templates definitions to developers and operators, it's not app centric, and platform can not perform aspect
4. when platform engineers want to upgrade Charts to all apps, they need to communicate with every team
5. helm can not validate the generated files util applying to kubernetes

YAM leverages Helm, 'helm-operator' plugin is built-in, for example:

```yaml
metadata:
  app: your-app
  namespace: your-team
prepare:
- type: helm
  chart: redis-cluster
  values:
    key: value
deploy:
  # ......
```

### Compare to Pulumi/Terraform

Pulumi/Terraform are more focused on IaC field, they are designed for Platform Engineer, NOT for application developers/operators.

YAM leverages Pulumi/Terraform, Platform Engineer could develop customized application model through these two awesome IaC platforms, while only exposes SIMPLE yaml definitions towards application developer/operator side.

```yaml
metadata:
  app: your-app
  namespace: your-team
prepare:
- type: terraform
  provider: aws
  variables:
    route53.domain: my-app.my-corp.com
deploy:
  # ...
```

### Compare to Open Application Model (OAM)

#### What YAM & OAM have in common

- Both are built for separation of concerns.
- Both are app centric.
- Both leverage existing ecosystem, Pulumi/Terraform/Helm/CRD Operators/Crossplane...
- Both are easily integrated to ANY CI/CD system.
#### What's the Differences

- OAM is introduce Trait concept, while YAM focuses on defining streamlined, concise, holistic app model, no special concepts introduced.
- OAM runtime KubeVela use Cuelang to define, validate, extend the model, while YAM glued plugins together by more programmable approach: JSON Schema + TypeScript
- OAM needs Kubernetes CRD and runtime deployed into cluster, while YAM is a lightweight tool written by Node.js/TypeScript and released to NPM, no requirements on Kubernetes.
- YAM introduce environment hierarchy: "Stack" and "Cluster". When specifying dynamic parameters, the key could be 'stack:envTag', while engTag is optional. Thus, cluster level dynamic values could be inherited from stack level, designed for large scale and multiple region deployment, it's powerful and flexible.
- YAM split operation workflow to two stages, plan & apply (inspired from terraform).
- Benefited from NPM, YAM plugin is more powerful, you could send HTTP requests and do anything you want in plugins, composing YAML is just piece of cake.
- YAM defines 

## Workflow

### Plugin Development

Define subset of JSON Schema + Handler Function, publish to https://yam.plus marketplace.

```bash
yam plugin --create mysql-provisioner

# npm install -g pnpm
# pnpm i
# pnpm run build
```

### Architecture

