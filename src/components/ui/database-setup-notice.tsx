import { AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DatabaseSetupNoticeProps {
  title?: string;
  message?: string;
  showInstructions?: boolean;
}

export const DatabaseSetupNotice = ({ 
  title = "Database Setup Required",
  message = "The banking system requires additional database tables. Please run the setup script to continue.",
  showInstructions = true 
}: DatabaseSetupNoticeProps) => {
  const openInstructions = () => {
    // This would ideally open the instructions file or a help modal
    window.open("/DATABASE_SETUP_INSTRUCTIONS.md", "_blank");
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-2">{title}</h3>
            <p className="text-sm text-amber-800 mb-4">{message}</p>
            
            {showInstructions && (
              <div className="space-y-3">
                <div className="text-sm text-amber-700">
                  <p className="font-medium mb-2">Quick Setup Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Open your Supabase project dashboard</li>
                    <li>Go to the SQL Editor</li>
                    <li>Copy and paste the contents of <code className="bg-amber-100 px-1 rounded">GLOBAL_BANKING_SYSTEM.sql</code></li>
                    <li>Click "Run" to execute the script</li>
                  </ol>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openInstructions}
                  className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  <ExternalLink size={14} />
                  View Full Instructions
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};