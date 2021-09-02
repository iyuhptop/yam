import {Action, Operator } from '@yam/types'

// cli implementation
// features:
//   manage parameters
//   manage configurations (~/.yam/config or specified location)
//   manage plugins and plugin env
//   provide commands for cli user:

// ==============  commands ==============
// # core features
// yam plan --version --dir --clusters [--stages prepare(default is all) --no-diff] --set
// yam apply --version --dir --clusters [--stages prepare --no-diff]
// yam apply -f release-plan-<timestamp>.bin (or apply with cloud plan state file)
// yam remove team/app --clusters
// yam up all-services.yaml (apply/release whole distributed system components) --clusters prod:us-east-2

// # yam.plus cloud features
// yam cloud --url --token (then all settings managed by cloud, cloud plan-state engine also available)
// yam rollback team/app --rev -2 --clusters (one button rollback, only available when cloud plan-state engine enabled, otherwise, need to revert git repo and apply again)

// # configuration and plugin management
// yam config TODO
// yam plugin enable/disable helm-operator
// yam plugin add/remove terraform-operator (prompt each env key-value input after install)

// # tools
// yam forward team/app --from-to 8080:8089 [--no-check]
// yam log team/app -f --limit(-l) 100 --recent 3m -c main-container
// yam exec team/pod-name -c main-container
// yam ui [--silent]