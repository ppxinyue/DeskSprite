import { TooltipProvider } from "@/components/ui/tooltip"
import "./index.css"

function App() {
  return (
    <TooltipProvider>
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <h1 className="text-2xl font-medium">DeskSprite</h1>
      </div>
    </TooltipProvider>
  )
}

export default App
