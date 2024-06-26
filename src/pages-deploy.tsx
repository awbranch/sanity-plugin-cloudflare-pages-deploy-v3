import axios from 'axios'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import { type Subscription } from 'rxjs'

import {
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Grid,
  Spinner,
  Stack,
  studioTheme,
  Switch,
  Text,
  TextInput,
  ThemeProvider,
  ToastProvider,
  useToast,
} from '@sanity/ui'
import { FormField, useColorScheme } from 'sanity'

import DeployItem from './deploy-item'
import { useClient } from './hook/useClient'
import type { SanityDeploySchema } from './types'
import PagesLogo from './pages-logo'

const initialDeploy = {
  title: '',
  project: '',
  team: '',
  url: '',
  token: '',
  disableDeleteAction: false,
}

const PagesDeploy = () => {
  const WEBHOOK_TYPE = 'webhook_deploy'
  const WEBHOOK_QUERY = `*[_type == "${WEBHOOK_TYPE}"] | order(_createdAt)`
  const client = useClient()
  const { scheme } = useColorScheme()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deploys, setDeploys] = useState<SanityDeploySchema[]>([])
  const [pendingDeploy, setpendingDeploy] = useState(initialDeploy)
  const toast = useToast()

  const onSubmit = async () => {
    // If we have a team slug, we'll have to get the associated teamId to include in every new request
    // Docs: https://vercel.com/docs/api#api-basics/authentication/accessing-resources-owned-by-a-team
    let pagesTeamID
    let pagesTeamName
    setIsSubmitting(true)

    if (pendingDeploy.team) {
      try {
        const fetchTeam = await axios.get(
          `https://api.vercel.com/v2/teams?slug=${pendingDeploy.team}`,
          {
            headers: {
              Authorization: `Bearer ${pendingDeploy.token}`,
            },
          }
        )

        if (!fetchTeam?.data?.id) {
          throw new Error('No team id found')
        }

        pagesTeamID = fetchTeam.data.id
        pagesTeamName = fetchTeam.data.name
      } catch (error) {
        console.error(error)
        setIsSubmitting(false)

        toast.push({
          status: 'error',
          title: 'No Team found!',
          closable: true,
          description:
            'Make sure the token you provided is valid and that the team’s slug correspond to the one you see in Pages',
        })

        return
      }
    }

    client
      .create({
        // Explicitly define an _id inside the pages-deploy path to make sure it's not publicly accessible
        // This will protect users' tokens & project info. Read more: https://www.sanity.io/docs/ids
        _id: `pages-deploy.${nanoid()}`,
        _type: WEBHOOK_TYPE,
        name: pendingDeploy.title,
        url: pendingDeploy.url,
        pagesProject: pendingDeploy.project,
        pagesTeam: {
          slug: pendingDeploy.team || undefined,
          name: pagesTeamName || undefined,
          id: pagesTeamID || undefined,
        },
        pagesToken: pendingDeploy.token,
        disableDeleteAction: pendingDeploy.disableDeleteAction,
      })
      .then(() => {
        toast.push({
          status: 'success',
          title: 'Success!',
          description: `Created Deployment: ${pendingDeploy.title}`,
        })
        setIsFormOpen(false)
        setIsSubmitting(false)
        setpendingDeploy(initialDeploy) // Reset the pending webhook state
      })
  }

  // Fetch all existing webhooks and listen for newly created
  useEffect(() => {
    let webhookSubscription: Subscription

    client.fetch(WEBHOOK_QUERY).then((w) => {
      setDeploys(w)
      setIsLoading(false)

      webhookSubscription = client
        .listen<SanityDeploySchema>(WEBHOOK_QUERY, {}, { includeResult: true })
        .subscribe({
          next: (res) => {
            if (res.type === 'mutation') {
              const wasCreated = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'create')
              )

              const wasPatched = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'patch')
              )

              const wasDeleted = res.mutations.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'delete')
              )

              const filterDeploy = (deploy: SanityDeploySchema) =>
                deploy._id !== res.documentId

              const updateDeploy = (deploy: SanityDeploySchema) =>
                deploy._id === res.documentId
                  ? (res.result as SanityDeploySchema)
                  : deploy

              if (wasCreated) {
                setDeploys((prevState) => {
                  if (res.result) {
                    return [...prevState, res.result]
                  }
                  return prevState
                })
              }
              if (wasPatched) {
                setDeploys((prevState) => {
                  const updatedDeploys = prevState.map(updateDeploy)

                  return updatedDeploys
                })
              }
              if (wasDeleted) {
                setDeploys((prevState) => prevState.filter(filterDeploy))
              }
            }
          },
        })
    })

    return () => {
      if (webhookSubscription) {
        webhookSubscription.unsubscribe()
      }
    }
  }, [WEBHOOK_QUERY, client])

  return (
    <ThemeProvider theme={studioTheme}>
      <ToastProvider>
        <Container display="grid" width={6} style={{ minHeight: '100%' }}>
          <Flex direction="column">
            <Card padding={4} borderBottom>
              <Flex align="center">
                <Flex flex={1} align="center">
                  <Card>
                    <PagesLogo variant="SIMPLE" width={40} />
                  </Card>
                  <Card marginX={1} style={{ opacity: 0.15 }}>
                    <svg
                      viewBox="0 0 24 24"
                      width="32"
                      height="32"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      shapeRendering="geometricPrecision"
                    >
                      <path d="M16.88 3.549L7.12 20.451" />
                    </svg>
                  </Card>
                  <Card>
                    <Text as="h1" size={2} weight="semibold">
                      Deployments
                    </Text>
                  </Card>
                </Flex>
                <Box>
                  <Button
                    type="button"
                    fontSize={2}
                    tone="primary"
                    padding={3}
                    radius={3}
                    text="Add Project"
                    onClick={() => setIsFormOpen(true)}
                  />
                </Box>
              </Flex>
            </Card>

            <Card flex={1}>
              <Stack as={'ul'}>
                {isLoading ? (
                  <Card as={'li'} padding={4}>
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      paddingTop={3}
                    >
                      <Spinner size={4} />
                      <Box padding={4}>
                        <Text size={2}>loading your deployments...</Text>
                      </Box>
                    </Flex>
                  </Card>
                ) : deploys.length ? (
                  deploys.map((deploy) => (
                    <Card key={deploy._id} as={'li'} padding={4} borderBottom>
                      <DeployItem
                        key={deploy._id}
                        name={deploy.name}
                        url={deploy.url}
                        _id={deploy._id}
                        pagesProject={deploy.pagesProject}
                        pagesTeam={deploy.pagesTeam}
                        pagesToken={deploy.pagesToken}
                        disableDeleteAction={deploy.disableDeleteAction}
                      />
                    </Card>
                  ))
                ) : (
                  <Card as={'li'} padding={5} paddingTop={6}>
                    <Flex direction="column" align="center" justify="center">
                      <PagesLogo width={350} variant="FULL" />

                      <Flex direction="column" align="center" padding={4}>
                        <Text size={3}>No deployments created yet.</Text>
                        <Box padding={4}>
                          <Button
                            fontSize={3}
                            paddingX={5}
                            paddingY={4}
                            tone="primary"
                            radius={4}
                            text="Add Project"
                            onClick={() => setIsFormOpen(true)}
                          />
                        </Box>

                        <Text size={1} weight="semibold" muted>
                          <a
                            href="https://github.com/ndimatteo/sanity-plugin-vercel-deploy#-your-first-vercel-deployment"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit' }}
                          >
                            Need help?
                          </a>
                        </Text>
                      </Flex>
                    </Flex>
                  </Card>
                )}
              </Stack>
            </Card>
          </Flex>
        </Container>

        {isFormOpen && (
          <Dialog
            header="New Project Deployment"
            id="create-webhook"
            width={1}
            onClickOutside={() => setIsFormOpen(false)}
            onClose={() => setIsFormOpen(false)}
            footer={
              <Box padding={3}>
                <Grid columns={2} gap={3}>
                  <Button
                    padding={4}
                    mode="ghost"
                    text="Cancel"
                    onClick={() => setIsFormOpen(false)}
                  />
                  <Button
                    padding={4}
                    text="Create"
                    tone="primary"
                    loading={isSubmitting}
                    onClick={() => onSubmit()}
                    disabled={
                      isSubmitting ||
                      !pendingDeploy.project ||
                      !pendingDeploy.url ||
                      !pendingDeploy.token
                    }
                  />
                </Grid>
              </Box>
            }
          >
            <Box padding={4}>
              <Stack space={4}>
                <FormField
                  title="Display Title (internal use only)"
                  description={
                    <>
                      This should be the environment you are deploying to, like{' '}
                      <em>Production</em> or <em>Staging</em>
                    </>
                  }
                >
                  <TextInput
                    type="text"
                    value={pendingDeploy.title}
                    onChange={(e) => {
                      e.persist()
                      const title = (e.target as HTMLInputElement).value
                      setpendingDeploy((prevState) => ({
                        ...prevState,
                        ...{ title },
                      }))
                    }}
                  />
                </FormField>

                <FormField
                  title="Pages Project Name"
                  description={`Pages Project: Settings → General → "Project Name"`}
                >
                  <TextInput
                    type="text"
                    value={pendingDeploy.project}
                    onChange={(e) => {
                      e.persist()
                      const project = (e.target as HTMLInputElement).value
                      setpendingDeploy((prevState) => ({
                        ...prevState,
                        ...{ project },
                      }))
                    }}
                  />
                </FormField>

                <FormField
                  title="Pages Team Name"
                  description={`Required for projects under a Pages Team: Settings → General → "Team Name"`}
                >
                  <TextInput
                    type="text"
                    value={pendingDeploy.team}
                    onChange={(e) => {
                      e.persist()
                      const team = (e.target as HTMLInputElement).value
                      setpendingDeploy((prevState) => ({
                        ...prevState,
                        ...{ team },
                      }))
                    }}
                  />
                </FormField>

                <FormField
                  title="Deploy Hook URL"
                  description={`Pages Project: Settings → Git → "Deploy Hooks"`}
                >
                  <TextInput
                    type="text"
                    inputMode="url"
                    value={pendingDeploy.url}
                    onChange={(e) => {
                      e.persist()
                      const url = (e.target as HTMLInputElement).value
                      setpendingDeploy((prevState) => ({
                        ...prevState,
                        ...{ url },
                      }))
                    }}
                  />
                </FormField>

                <FormField
                  title="Pages Token"
                  description={`Pages Account dropdown: Settings → "Tokens"`}
                >
                  <TextInput
                    type="text"
                    value={pendingDeploy.token}
                    onChange={(e) => {
                      e.persist()
                      const token = (e.target as HTMLInputElement).value
                      setpendingDeploy((prevState) => ({
                        ...prevState,
                        ...{ token },
                      }))
                    }}
                  />
                </FormField>

                <FormField>
                  <Card paddingY={3}>
                    <Flex align="center">
                      <Switch
                        id="disableDeleteAction"
                        style={{ display: 'block' }}
                        onChange={(e) => {
                          e.persist()
                          const isChecked = (e.target as HTMLInputElement)
                            .checked

                          setpendingDeploy((prevState) => ({
                            ...prevState,
                            ...{ disableDeleteAction: isChecked },
                          }))
                        }}
                        checked={pendingDeploy.disableDeleteAction}
                      />
                      <Box flex={1} paddingLeft={3}>
                        <Text>
                          <label htmlFor="disableDeleteAction">
                            Disable the "Delete" action for this item in
                            production?
                          </label>
                        </Text>
                      </Box>
                    </Flex>
                  </Card>
                </FormField>
              </Stack>
            </Box>
          </Dialog>
        )}
      </ToastProvider>
    </ThemeProvider>
  )
}

export default PagesDeploy
