# ResolveConfig

Layer and resolve configuration from YAML, JSON, or `.env` templates: merge multiple sources, interpolate literals (environment, built-in functions, AWS Parameter Store / Secrets Manager), write resolved files, and read values from the CLI or Node.js.

**Requirements:** Node.js ≥ 22, Yarn ≥ 4 (see `package.json` `engines`).

## Features

- Layered manifests: `.config/{stage}.{module}.yml` (or `.yaml` / `.json`) with named targets under `configs`
- CLI: `apply`, `get`, `set`, `template`
- Literals in strings and manifest fields: `env:`, `func:`, `context:`, `arn:…`, `$object{…}`
- Per-template `resolve` modes, root merge with `name: "@"`, nested paths via `.` or `__`
- Async or sync `resolveConfig` / `resolveTemplate` plus helpers (dotenv, YAML, typed getters)
- Optional `@aws-sdk/*` peer packages for SSM / Secrets Manager ARNs

## Install

```bash
yarn add @povio/resolve-config
```

Run the CLI without installing (pick compatible AWS SDK versions if you use ARNs):

```bash
yarn dlx @povio/resolve-config@1.3.0 apply
```

## CLI

Global flags (where supported): `--stage`, `--cwd`, `--module`, `--path`, `--verbose`. `STAGE` environment variable maps to `--stage` when set.

### `apply`

Resolves the manifest and writes targets (use `--target` for one).

```bash
# Defaults: stage from $STAGE or "local", module "config" → .config/local.config.yml
yarn resolve-config apply

# Shorthand → .config/myapp-dev.backend.yml
yarn resolve-config apply myapp-dev.backend

yarn resolve-config apply --stage myapp-dev --module backend
yarn resolve-config apply --path .config/myapp-dev.backend.yml --stage myapp-dev

# Only one named target from the manifest
yarn resolve-config apply myapp-dev.backend --target bootstrap
```

`apply` writes each target’s `destination`; format follows the extension (`.json`, `.yml` / `.yaml`, `.env`, `.env.*`) or `destinationFormat`. Missing parent directories are created.

### `get`

Resolves one target and prints to stdout. `--target` is required unless you use the `stage.module.target` positional (stage, module, and target name).

```bash
yarn resolve-config get myapp-dev.config.resolved

# Property: use . or __ for path segments
yarn resolve-config get myapp-dev.config.resolved --property database.password
yarn resolve-config get myapp-dev.config.resolved --property database__password

# Output: json (default), yaml | yml, env, env-json
yarn resolve-config get myapp-dev.config.resolved --outputFormat yml

yarn resolve-config get --stage myapp-dev --module config --target resolved \
  --property database.password --outputFormat yml

# Subset of keys (comma-separated), nested paths with . or __
yarn resolve-config get dev.config.resolved --outputFormat env \
  --keys mysection.myparameter --cwd ./test --prefix 'export '
```

`--keys` and `--property` cannot be used together.

### `set`

Updates a YAML file under `.config/` (merge by default). Requires either `--property` (with `--value`) or `--json`. YAML output format only (`yml` / `yaml`).

```bash
yarn resolve-config set --path .config/myapp-dev.config.override.yml \
  --property database.password --value 'mypass'

yarn resolve-config set --stage myapp-dev --module config.override \
  --property database.password --value 'mypass'

# Replace entire file contents
yarn resolve-config set --path .config/foo.yml --json '{"a":1}' --replace
```

### `template`

Resolves one template module or file and prints the result. Without `--path` / `--format`, loads `.config/{stage}.{module}.(yml|yaml|json|env)` or `.config/{stage}.{module}.template.(…)`.

```bash
yarn resolve-config template --module api.template --resolve only --outputFormat yml
yarn resolve-config template --path ./.config/local.api.yml --property section.key
```

Flags: `--format`, `--property`, `--resolve`, `--ignoreEmpty`, `--outputFormat` (`json` | `yml` | `yaml` | `env`).

## Configuration manifest

Default path: `.config/{stage}.{module}.yml` (or `.yaml` / `.json`). Top-level key **`configs`**: either an array of targets or a single object (treated as one target named `default`).

Each target may define:

| Field               | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `name`              | Target id (used with `get` / `apply --target`).          |
| `destination`       | Relative path to write when `apply` runs.                |
| `destinationFormat` | Override format (`json`, `yml`, `yaml`, `env`).          |
| `contextFile`       | Path relative to `--cwd`: load JSON, YAML, or `.env` and merge into the resolution context after `stage`, before `resolveConfig({ context })`. |
| `context`           | Merged into the literal resolution context per value (e.g. `aws`); overrides `contextFile` and SDK `context` for overlapping keys. |
| `values`            | Ordered list of fragments to merge.                      |

Each **value** entry:

| Field            | Purpose                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `name`           | Tree path (`@` = merge into root), supports `__` / `.` nesting.                       |
| `value`          | Static string.                                                                        |
| `valueFrom`      | Literal string (`env:…`, `func:…`, `context:…`, `arn:…`) resolved and assigned as a scalar. |
| `objectFrom`     | Like `valueFrom` but the string is parsed as JSON into an object.                     |
| `templateModule` | Load `.config/{stage}.{module}` template (same discovery rules as `resolveTemplate`). |
| `templatePath`   | Absolute path override for template file.                                             |
| `resolve`        | `ignore` \| `remove` \| `only` \| `all` for that template.                            |
| `ignoreEmpty`    | If the template file is missing, skip instead of erroring.                            |

Example (abbreviated):

```yaml
configs:
  - name: bootstrap
    # where to write the resulting file
    destination: ./.config/myapp-dev.api.resolved.yml
    values:
      # render the root from a template
      - name: "@"
        templateModule: api.template
        resolve: "only"

      # override a variable from an env value
      - name: database__host
        valueFrom: env:DATABASE_HOST

      - name: database__username
        value: myapp

      - name: feature_flags
        # expand json into object
        objectFrom: arn:aws:ssm:::parameter/myapp/feature/flags

    # context that plugins and context: literals can use
    context:
      aws:
        accountId: "1234567890"
        region: "us-east-1"

  - name: from_shared_context
    contextFile: ./.config/shared-context.json
    values:
      - name: service__name
        valueFrom: context:serviceName

  - name: resolved
    values:
      # use the template without resolved items
      - name: "@"
        templateModule: api.template
        resolve: "remove"

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

Template files are YAML, JSON, or `.env` shaped trees. String leaves may include placeholders matching `\$[a-z]*\{…}`.

**`context:`** reads a value from the resolution context (manifest `context`, `contextFile`, SDK `context`, plus `stage`). Use a property path with dots for nesting, e.g. `context:tenantId` or `context:aws.region`. After the first `:`, remaining colons are kept (same idea as `env:` for odd key names).

```yaml
app: ${env:APP_ENV}
stage: ${func:stage}
tenant: ${context:tenantId}
generatedAt: ${func:timestamp}
secretblock: $object{arn:aws:ssm:us-east-1:1234567890:parameter/myapp/feature/block}
```

## SDK

```typescript
// Sync: no async AWS literals in template steps
const syncTree = resolveConfigSync({
  stage: process.env.STAGE,
  module: "backend",
  target: "resolved",
  apply: false,
});

// Async: full resolution including ARNs
const asyncTree = await resolveConfig({
  stage: process.env.STAGE,
  module: "backend",
  target: "bootstrap",
  apply: true,
  // Merged after stage (and after any target `contextFile`); target inline `context` in YAML still wins on conflicts.
  context: { aws: { region: "us-east-1", accountId: "1234567890" } },
});

const password = getString(asyncTree, "database.password");
const port = getNumber(asyncTree, "database.port");
const enabled = getBoolean(asyncTree, "database.enabled");
```

## AWS plugin

Optional `@aws-sdk/client-ssm`, `@aws-sdk/client-secrets-manager`, `@aws-sdk/client-sts`, and `@aws-sdk/credential-providers` are loaded when ARN literals resolve. `context.aws` can set `accountId`, `region`, and optional `credentials` / `endpoint`.

Install optional peer dependencies when using `arn:…` literals:

```bash
yarn dlx -p @aws-sdk/client-ssm -p @aws-sdk/client-sts -p @aws-sdk/credential-providers @povio/resolve-config@1.0 apply
```

Use in resolver:

```yml
section:
  # Fetch value from SSM
  secret: ${arn:aws:ssm:::parameter/myapp/feature/flags}
  # Expand a JSON value into an object, e.g.
  # secretblock:
  #   val: 1
  secretblock: $object{arn:aws:ssm:::parameter/myapp/feature/block}
```

## Publishing (maintainers)

Clean `git status`, then bump if needed, build, publish ([`@povio/resolve-config`](https://www.npmjs.com/package/@povio/resolve-config), `--access public`):

```bash
npm version <semver> --no-git-tag-version   # skip if package.json already matches
npm run build
npm publish --access public                 # stable → latest
# npm publish --tag beta --access public    # prerelease: --tag = first label in version (e.g. beta)
# npm publish --dry-run --access public     # optional; add --tag for prerelease
```
