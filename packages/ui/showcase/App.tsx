import { useState, useMemo } from 'react'
import { LiveProvider, LivePreview, LiveEditor, LiveError } from 'react-live'
import {
  Button,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  GlassCard, GlassCardHeader, GlassCardContent,
  Badge,
  Input,
  Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  Tabs, TabsList, TabsTrigger, TabsContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Separator,
  Progress,
  Skeleton,
  Spinner,
  LoadingSpinner,
  EmptyState,
  ErrorBanner,
  CollapsibleSection,
  Label,
  Tooltip, TooltipTrigger, TooltipContent,
  Switch,
  Checkbox,
  RadioGroup, RadioGroupItem,
  Slider,
  Toggle,
  Avatar, AvatarImage, AvatarFallback,
  ScrollArea,
  Stack,
  Flex,
  ResponsiveGrid,
  AnimatedNumber,
  StatusDot,
  Pressable,
  FadeIn,
  StatCard,
  NetworkBackground,
  PageTransition,
  StartupOSMotionConfig,
} from '../src/index'
import { Sun, Moon, Inbox, Info, Bold, Italic, Underline, BookOpen, Layers, Paintbrush, Code2, Activity, Users, Zap, Clock } from 'lucide-react'
import registry from '../registry.json'

// Scope for LiveProvider — all components available in the playground
const liveScope = {
  Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  GlassCard, GlassCardHeader, GlassCardContent, Badge, Input, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  Tabs, TabsList, TabsTrigger, TabsContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Separator, Progress, Skeleton, Spinner, LoadingSpinner, EmptyState, ErrorBanner,
  CollapsibleSection, Label, Tooltip, TooltipTrigger, TooltipContent, Switch,
  Checkbox, RadioGroup, RadioGroupItem, Slider, Toggle,
  Avatar, AvatarImage, AvatarFallback, ScrollArea, Stack, Flex, ResponsiveGrid,
  AnimatedNumber, StatusDot, Pressable, FadeIn, StatCard, NetworkBackground,
  PageTransition, StartupOSMotionConfig,
  Inbox, Info, Bold, Italic, Underline, Activity, Users, Zap, Clock,
}

type RegistryComponent = (typeof registry.components)[number]

// ─── Registry Browser ────────────────────────────────────────────────

function RegistryBrowser() {
  const [filter, setFilter] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<RegistryComponent | null>(null)

  const categories = ['atom', 'molecule', 'organism', 'layout'] as const
  const filtered = useMemo(() =>
    registry.components.filter(c => {
      const matchesCategory = !selectedCategory || c.category === selectedCategory
      const matchesSearch = !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.tags.some(t => t.includes(filter.toLowerCase()))
      return matchesCategory && matchesSearch
    }),
    [filter, selectedCategory]
  )

  if (selectedComponent) {
    return <ComponentDetail component={selectedComponent} onBack={() => setSelectedComponent(null)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search components..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1.5">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="xs"
            onClick={() => setSelectedCategory(null)}
          >All</Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="xs"
              onClick={() => setSelectedCategory(cat)}
            >{cat}</Button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(comp => (
          <button
            key={comp.slug}
            onClick={() => setSelectedComponent(comp)}
            className="cursor-pointer rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/30"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm">{comp.name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{comp.category}</Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{comp.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {comp.tags.slice(0, 3).map(tag => (
                <span key={tag} className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ComponentDetail({ component: c, onBack }: { component: RegistryComponent; onBack: () => void }) {
  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">&larr; Back to registry</Button>
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-light">{c.name}</h3>
          <Badge variant="outline">{c.category}</Badge>
        </div>
        <p className="mt-2 text-muted-foreground">{c.description}</p>
        <code className="mt-3 block rounded bg-muted px-3 py-2 text-xs">{c.importStatement}</code>
      </div>

      {c.props.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Props</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Default</th>
                  <th className="pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {c.props.map(p => (
                  <tr key={p.name} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs">{p.name}{p.required && <span className="text-destructive">*</span>}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{p.type}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{'default' in p ? String(p.default) : '—'}</td>
                    <td className="py-2 text-xs text-muted-foreground">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {c.variants && c.variants.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Variants</h4>
          {c.variants.map(v => (
            <div key={v.name} className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">{v.name} (default: {v.default})</p>
              <div className="flex flex-wrap gap-2">
                {v.options.map(opt => (
                  <div key={opt.value} className="rounded border px-3 py-1.5">
                    <code className="text-xs font-medium">{opt.value}</code>
                    <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {c.slots.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Slots</h4>
          <div className="space-y-2">
            {c.slots.map(s => (
              <div key={s.name} className="flex items-start gap-2 text-sm">
                <code className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs">{s.name}</code>
                <span className="text-xs text-muted-foreground">
                  {s.required && <Badge variant="destructive" className="mr-1 text-[10px]">required</Badge>}
                  {s.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.compositionRules.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Composition Rules</h4>
          <ul className="space-y-1">
            {c.compositionRules.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] shrink-0">{r.type}</Badge>
                {r.rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.examples.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Examples</h4>
          {c.examples.map((ex, i) => (
            <div key={i} className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">{ex.title}</p>
              <LiveProvider code={ex.code} scope={liveScope} noInline={false}>
                <div className="rounded-lg border overflow-hidden">
                  <div className="p-4 bg-background">
                    <LivePreview />
                  </div>
                  <div className="border-t bg-muted/50">
                    <LiveEditor className="text-xs !font-mono !bg-transparent p-3" />
                  </div>
                  <LiveError className="bg-destructive/10 text-destructive text-xs p-2" />
                </div>
              </LiveProvider>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Design Tokens ───────────────────────────────────────────────────

function DesignTokens() {
  return (
    <div className="space-y-12">
      {/* Colors */}
      <section>
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground mb-4">Colors</h3>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
          {[
            ['Background', 'bg-background', 'border'],
            ['Foreground', 'bg-foreground', ''],
            ['Card', 'bg-card', 'border'],
            ['Primary', 'bg-primary', ''],
            ['Secondary', 'bg-secondary', 'border'],
            ['Muted', 'bg-muted', 'border'],
            ['Accent', 'bg-accent', 'border'],
            ['Destructive', 'bg-destructive', ''],
            ['Border', 'bg-border', ''],
            ['Input', 'bg-input', ''],
            ['Ring', 'bg-ring', ''],
          ].map(([name, bg, extra]) => (
            <div key={name} className="space-y-1.5">
              <div className={`h-12 rounded-md ${bg} ${extra}`} />
              <p className="text-xs text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground mb-4">Typography</h3>
        <div className="space-y-3">
          <p className="text-3xl font-light tracking-tight">Light 300 — Headline</p>
          <p className="text-xl">Regular 400 — Body Large</p>
          <p className="text-base">Regular 400 — Body</p>
          <p className="text-sm font-medium">Medium 500 — Label</p>
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Semibold 600 — Overline</p>
        </div>
      </section>

      {/* Spacing */}
      <section>
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground mb-4">Spacing</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 6, 8, 12, 16].map(n => (
            <div key={n} className="flex items-center gap-3">
              <span className="w-8 text-xs text-muted-foreground text-right">{n}</span>
              <div className={`h-3 rounded bg-primary/60`} style={{ width: `${n * 4}px` }} />
              <span className="text-xs text-muted-foreground">{n * 4}px</span>
            </div>
          ))}
        </div>
      </section>

      {/* Radius */}
      <section>
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground mb-4">Border Radius</h3>
        <div className="flex flex-wrap gap-4">
          {[
            ['sm', 'rounded-sm'],
            ['md', 'rounded-md'],
            ['lg', 'rounded-lg'],
            ['xl', 'rounded-xl'],
            ['full', 'rounded-full'],
          ].map(([name, cls]) => (
            <div key={name} className="text-center space-y-1.5">
              <div className={`h-16 w-16 bg-primary/20 border border-primary/40 ${cls}`} />
              <p className="text-xs text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Glass Effects */}
      <section>
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground mb-4">Glass Effects</h3>
        <div className="relative rounded-lg bg-gradient-to-br from-primary/20 via-accent to-secondary/30 p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass rounded-lg p-6">
              <h4 className="font-medium">Glass</h4>
              <p className="mt-2 text-sm text-muted-foreground">Full glass effect with backdrop blur and border.</p>
            </div>
            <div className="glass-subtle rounded-lg p-6">
              <h4 className="font-medium">Glass Subtle</h4>
              <p className="mt-2 text-sm text-muted-foreground">Lighter glass effect for secondary surfaces.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Live Playground ─────────────────────────────────────────────────

function Playground() {
  const [code, setCode] = useState(
`<Card className="max-w-sm">
  <CardHeader>
    <CardTitle>Live Editor</CardTitle>
    <CardDescription>Edit this code and see changes instantly.</CardDescription>
  </CardHeader>
  <CardContent>
    <Stack gap={3}>
      <div className="grid gap-2">
        <Label htmlFor="demo-name">Name</Label>
        <Input id="demo-name" placeholder="Enter your name" />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="demo-notify" />
        <Label htmlFor="demo-notify">Enable notifications</Label>
      </div>
    </Stack>
  </CardContent>
  <CardFooter>
    <Flex gap={2} justify="end" className="w-full">
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </Flex>
  </CardFooter>
</Card>`
  )

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-medium mb-3">Code</h3>
        <LiveProvider code={code} scope={liveScope} noInline={false}>
          <div className="rounded-lg border overflow-hidden">
            <LiveEditor
              className="text-xs !font-mono !bg-muted/30 min-h-[400px]"
              onChange={setCode}
            />
            <LiveError className="bg-destructive/10 text-destructive text-xs p-3 border-t" />
          </div>
        </LiveProvider>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Preview</h3>
        <LiveProvider code={code} scope={liveScope} noInline={false}>
          <div className="rounded-lg border bg-background p-6 min-h-[400px]">
            <LivePreview />
          </div>
        </LiveProvider>
      </div>
    </div>
  )
}

// ─── Interactive Demos ───────────────────────────────────────────────

function AnimatedNumberDemo() {
  const [val, setVal] = useState(1234)
  return (
    <div className="flex items-center gap-4">
      <span className="text-4xl font-light tabular-nums">
        <AnimatedNumber value={val} />
      </span>
      <Button size="sm" variant="outline" onClick={() => setVal(Math.floor(Math.random() * 10000))}>
        Randomize
      </Button>
    </div>
  )
}

function FadeInDemo() {
  const [key, setKey] = useState(0)
  return (
    <div className="space-y-4">
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        Replay
      </Button>
      <div key={key} className="flex gap-3">
        {['up', 'down', 'left', 'right'].map((dir, i) => (
          <FadeIn key={dir} index={i} direction={dir as 'up' | 'down' | 'left' | 'right'}>
            <div className="rounded-lg border bg-card px-4 py-3 text-center">
              <p className="text-xs font-medium">{dir}</p>
              <p className="text-[10px] text-muted-foreground">index={i}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  )
}

// ─── Component Demos ─────────────────────────────────────────────────

function ComponentDemos() {
  const [progress, setProgress] = useState(60)

  return (
    <div className="space-y-16">
      {/* Buttons */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button variant="glass">Glass</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Cards</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
              <CardDescription>A clean, understated card with warm tones.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Content area with generous spacing.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
          <GlassCard>
            <GlassCardHeader>
              <CardTitle>Glass Card</CardTitle>
              <CardDescription>Frosted glass effect with backdrop blur.</CardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-muted-foreground">Transparent background with blur.</p>
            </GlassCardContent>
          </GlassCard>
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      {/* Form Controls */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Form Controls</h2>
        <div className="grid max-w-md gap-6">
          <div className="grid gap-2">
            <Label htmlFor="demo-input">Text Input</Label>
            <Input id="demo-input" placeholder="Text input..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="demo-textarea">Textarea</Label>
            <Textarea id="demo-textarea" placeholder="Textarea..." />
          </div>
          <div className="grid gap-2">
            <Label>Select</Label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="braun">Braun</SelectItem>
                <SelectItem value="vitsoe">Vitsoe</SelectItem>
                <SelectItem value="rams">Rams</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="demo-switch" />
            <Label htmlFor="demo-switch">Enable feature</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="demo-checkbox" />
            <Label htmlFor="demo-checkbox">Accept terms and conditions</Label>
          </div>
          <div className="space-y-2">
            <Label>Radio Group</Label>
            <RadioGroup defaultValue="option-1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option-1" id="r1" />
                <Label htmlFor="r1">Option 1</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option-2" id="r2" />
                <Label htmlFor="r2">Option 2</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option-3" id="r3" />
                <Label htmlFor="r3">Option 3</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Slider</Label>
            <Slider defaultValue={[50]} max={100} step={1} />
          </div>
        </div>
      </section>

      {/* Toggle & Tooltip */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Toggle & Tooltip</h2>
        <div className="flex items-center gap-3">
          <Toggle aria-label="Toggle bold"><Bold className="h-4 w-4" /></Toggle>
          <Toggle aria-label="Toggle italic"><Italic className="h-4 w-4" /></Toggle>
          <Toggle aria-label="Toggle underline" variant="outline"><Underline className="h-4 w-4" /></Toggle>
          <Separator orientation="vertical" className="h-6" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon"><Info className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Helpful information</TooltipContent>
          </Tooltip>
        </div>
      </section>

      {/* Avatar */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Avatar</h2>
        <div className="flex items-center gap-4">
          <Avatar size="sm"><AvatarFallback>S</AvatarFallback></Avatar>
          <Avatar><AvatarFallback>MD</AvatarFallback></Avatar>
          <Avatar size="lg"><AvatarFallback>LG</AvatarFallback></Avatar>
        </div>
      </section>

      {/* Tabs */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Tabs</h2>
        <Tabs defaultValue="design">
          <TabsList>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="design" className="mt-4">
            <p className="text-sm text-muted-foreground">Good design is as little design as possible.</p>
          </TabsContent>
          <TabsContent value="code" className="mt-4">
            <p className="text-sm text-muted-foreground">Less, but better.</p>
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <p className="text-sm text-muted-foreground">Back to purity, back to simplicity.</p>
          </TabsContent>
        </Tabs>
      </section>

      {/* Dialogs */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Dialogs & Sheets</h2>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild><Button variant="outline">Open Dialog</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>A clean, focused dialog.</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline">Alert Dialog</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Sheet>
            <SheetTrigger asChild><Button variant="outline">Open Sheet</Button></SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet Title</SheetTitle>
                <SheetDescription>Side panel with warm background.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline">Dropdown</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Item One</DropdownMenuItem>
              <DropdownMenuItem>Item Two</DropdownMenuItem>
              <DropdownMenuItem>Item Three</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {/* Collapsible */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Collapsible</h2>
        <div className="max-w-md space-y-2">
          <CollapsibleSection title="Default variant" defaultOpen>
            <p className="text-sm text-muted-foreground">Expanded content with smooth animation.</p>
          </CollapsibleSection>
          <CollapsibleSection title="Compact variant" variant="compact">
            <p className="text-sm text-muted-foreground">Smaller trigger for dense layouts.</p>
          </CollapsibleSection>
        </div>
      </section>

      {/* Progress & Loading */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Progress & Loading</h2>
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <input type="range" min="0" max="100" value={progress}
                onChange={e => setProgress(Number(e.target.value))} className="w-24" />
            </div>
            <Progress value={progress} />
          </div>
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Skeleton</span>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Spinner</span>
            <Spinner />
          </div>
        </div>
      </section>

      <Separator />

      {/* States */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">States</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent>
              <EmptyState icon={<Inbox className="h-8 w-8" />} message="No items yet" hint="Create your first item to get started" />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <ErrorBanner message="Something went wrong. Please try again." />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <LoadingSpinner message="Loading data..." />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Animated Number */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Animated Number</h2>
        <p className="mb-4 text-sm text-muted-foreground">Spring-animated number display. Click to randomize.</p>
        <AnimatedNumberDemo />
      </section>

      {/* Status Dot */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Status Dot</h2>
        <div className="flex flex-wrap items-center gap-6">
          <StatusDot status="online" label="Online" />
          <StatusDot status="offline" label="Offline" />
          <StatusDot status="warning" label="Warning" />
          <StatusDot status="error" label="Error" />
          <StatusDot status="online" />
        </div>
      </section>

      {/* Pressable */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Pressable</h2>
        <p className="mb-4 text-sm text-muted-foreground">Tap/click to see the spring press effect.</p>
        <div className="flex gap-4">
          <Pressable>
            <Card className="cursor-pointer select-none">
              <CardContent className="p-4">
                <p className="text-sm font-medium">Press me</p>
              </CardContent>
            </Card>
          </Pressable>
          <Pressable as="button">
            <Button variant="outline">Pressable Button</Button>
          </Pressable>
        </div>
      </section>

      {/* Fade In */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Fade In</h2>
        <p className="mb-4 text-sm text-muted-foreground">Staggered entrance animation with directional offset.</p>
        <FadeInDemo />
      </section>

      {/* Stat Card */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Stat Card</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Activity className="h-4 w-4" />} label="Active Tasks" value="42" index={0} />
          <StatCard icon={<Users className="h-4 w-4" />} label="Agents" value="8" index={1} />
          <StatCard icon={<Zap className="h-4 w-4" />} label="Success Rate" value="97.3%" index={2} />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Avg Duration" value="2.4s" index={3} />
        </div>
      </section>

      {/* Network Background */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Network Background</h2>
        <div className="relative h-64 rounded-lg border overflow-hidden">
          <NetworkBackground nodeCount={30} connectionDistance={28} />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Decorative SVG network with animated nodes</p>
          </div>
        </div>
      </section>

      {/* Motion Config */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Motion Config & Page Transition</h2>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">StartupOSMotionConfig</code> — wraps app to respect <code className="rounded bg-muted px-1.5 py-0.5 text-xs">prefers-reduced-motion</code>.
          </p>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PageTransition</code> — fade transition keyed on pathname (coarsened to top-2 segments).
          </p>
          <code className="block rounded bg-muted px-3 py-2 text-xs">
            {`<StartupOSMotionConfig><PageTransition pathname={pathname}>...</PageTransition></StartupOSMotionConfig>`}
          </code>
        </div>
      </section>

      {/* Layout Primitives */}
      <section>
        <h2 className="mb-6 text-sm font-medium tracking-wide uppercase text-muted-foreground">Layout Primitives</h2>
        <div className="space-y-8">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Stack (vertical flex)</p>
            <Stack gap={2} className="max-w-xs rounded-lg border p-4">
              <div className="h-8 rounded bg-primary/20" />
              <div className="h-8 rounded bg-primary/30" />
              <div className="h-8 rounded bg-primary/40" />
            </Stack>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-3">Flex (horizontal flex)</p>
            <Flex gap={2} align="center" className="rounded-lg border p-4">
              <div className="h-8 w-24 rounded bg-primary/20" />
              <div className="h-12 w-24 rounded bg-primary/30" />
              <div className="h-6 w-24 rounded bg-primary/40" />
            </Flex>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-3">ResponsiveGrid</p>
            <ResponsiveGrid minChildWidth="8rem" gap={3}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-16 rounded-lg bg-primary/20 flex items-center justify-center text-xs text-muted-foreground">{i + 1}</div>
              ))}
            </ResponsiveGrid>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────

const navItems = [
  { id: 'components', label: 'Components', icon: Layers },
  { id: 'registry', label: 'Registry', icon: BookOpen },
  { id: 'tokens', label: 'Design Tokens', icon: Paintbrush },
  { id: 'playground', label: 'Playground', icon: Code2 },
] as const

type NavItem = (typeof navItems)[number]['id']

export function App() {
  const [dark, setDark] = useState(false)
  const [activeTab, setActiveTab] = useState<NavItem>('components')

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="glass-subtle sticky top-0 z-50 border-b border-border px-8 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-lg tracking-[0.2em] uppercase font-light">StartupOS UI</h1>
              <nav className="flex gap-1">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDark(!dark)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-8 py-12">
          {activeTab === 'components' && <ComponentDemos />}
          {activeTab === 'registry' && <RegistryBrowser />}
          {activeTab === 'tokens' && <DesignTokens />}
          {activeTab === 'playground' && <Playground />}
        </main>
      </div>
    </div>
  )
}
