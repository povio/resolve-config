# ResolveConfig

### CLI

Generate environment files based on a config file

```bash
# default, stage=local module=config
yarn resolve apply

# short form, [stage].[module]
yarn resolve apply myapp-dev.backend

# custom stage/module, resolves into .config/myapp-dev.backend.yml
yarn resolve apply --stage myapp-dev --module backend

# by path and stage
yarn resolve apply --path .config/myapp-dev.backend.yml --stage myapp-dev

# only 1 target
yarn resolve apply myapp-dev.backend --target bootstrap
```

Get values/trees from resolved targets

```bash
# short form
yarn resolve get myapp-dev.backend.resolved

# specify property to return
yarn resolve get myapp-dev.backend.resolved:database.password

# specify output format in  json | env | yml
yarn resolve get myapp-dev.backend.resolved --outputFormat yml

# long form
yarn resolve get --stage myapp-dev --module backend --target resolved --property database.password --outputFormat yml
```

### SDK

```typescript
import { loadConfig, resolveConfig } from '@povio/resolve-config';

// will only load sync values
const config1 = loadConfig({
    stage: process.env.STAGE,
    module: 'backend',
    target: 'resolved'
});

// will load async values
const config2 = await resolveConfig({
    stage: process.env.STAGE,
    module: 'backend',
    target: 'bootstrap',
});

```

## Configuration

`.config/[stage].[module].yml`, eq `.config/myapp-dev.config.yml`

```yaml
configs:
  - name: bootstrap
    # where to write the resulting file
    destination: ./.config/myapp-dev.api.resolved.yml
    values:

      # render the root from a template
      - name: "@"
        templateModule: api.template
        resolve: 'only'
        
      # override a variable from an env value
      - name: database__host
        valueFrom: env:DATABASE_HOST
        
      - name: database__username
        value: myapp
      
      - name: feature_flags
        # expand json into object
        objectFrom: arn:aws:ssm:::parameter/myapp/feature/flags
        
    # context that plugins can use
    context:
      aws:
        accountId: "1234567890"
        region: "us-east-1"
    
  - name: resolved
    values:
      # use the template without resolved items
      - name: "@"
        templateModule: api.template
        resolve: 'none'
        
      # override with resolved items
      - name: "@"
        templateModule: api.resolved
        ignoreEmpty: true
        
      # optional overrides
      - name: "@"
        templateModule: api.override
        ignoreEmpty: true

```

## Templates

```yaml
# static values
section1:
  myparameter: mylvalue
  deepsection:
    myparameter2: mylvalue

# functions
section2:
  stage: ${func:stage}
  timeatrender: ${func:timestamp}

# environment
section3:
  fromenv: ${env:APP_ENV}

# AWS SSM Values
section4:
   # Fetch value from SSM
   secret: ${arn:aws:ssm:::parameter/myapp/feature/flags}
   # Expand a JSON vaule into a object, eq
   # secretblock:
   #   val: 1
   secretblock: $object{arn:aws:ssm:::parameter/myapp/feature/block}
```

## Env overrides

Env overrides can be applied at each step using `__` separated paths:

```bash
# apply override at the end of each target
CONFIG__database__name=myapp yarn resolve
```
