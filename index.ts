// addon -> on whole json node
// prepare.type=“redis” => redisSync
// prepare.type="redis".mountEnv=true => redisEnvProvisioner

// addon:
// function operate(plan , diff, allDiff, allYam) {
//    plan.appendAction()
// }

// action (context) { context.kubeClient }

// args: context, diff, allDiff, allYam

// context.sendWebhook(axios request config)

// context.mergeToYaml(file name, partial object)
// context.appendToYamlArray(file name, json path, array item)
// context.removeYamlPart(file name, "json path")
// context.deleteYaml(file name)

// context.runJobInCluster("image", "")
// context.k8sClient, do anything
// context.getConfigMap/getXXX


// yam kebab ---prepare---config---deploy---access---observe---scale----

// order issue, resolved by json order

//  plan stage, run stage, status check -> create redis 


// for eg. redis sync:
//   if plan stage: send ticket to zendesk or jira (append to postPlanActions, need choose execute or not, and force yes when running without plan)
//   if run stage: wait ticket status approved, then create Redis CRD yaml, check util redis pod running


// how to check if it's out of sync, merge changes back ? low priority
// how to do admission control, artifact and env promote, this is the job of CD workflow, not automation engine

console.log("sss")
console.log ('sss')