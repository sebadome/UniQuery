import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  ChevronRight, 
  Database, 
  MessageSquare, 
  Search,
  Code,
  Play,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Shield,
  Users,
  TrendingUp,
  Settings
} from 'lucide-react';

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const exampleQueries = [
    {
      category: "Consultas Básicas",
      icon: Database,
      color: "bg-blue-100 text-blue-600",
      examples: [
        {
          title: "Contar Registros",
          query: "¿Cuántos usuarios hay en la base de datos?",
          description: "Obtener el total de registros en una tabla",
          tags: ["Contar", "Básico"]
        },
        {
          title: "Listar Tablas",
          query: "¿Qué tablas están disponibles en mi base de datos?",
          description: "Mostrar todas las tablas en la base de datos conectada",
          tags: ["Esquema", "Tablas"]
        },
        {
          title: "Mostrar Columnas",
          query: "¿Qué columnas tiene la tabla usuarios?",
          description: "Mostrar la estructura de una tabla específica",
          tags: ["Esquema", "Columnas"]
        }
      ]
    },
    {
      category: "Análisis de Clientes",
      icon: Users,
      color: "bg-green-100 text-green-600",
      examples: [
        {
          title: "Mejores Clientes",
          query: "Muéstrame los 10 mejores clientes por monto total de compra",
          description: "Encuentra tus clientes de mayor valor",
          tags: ["Clientes", "Ingresos"]
        },
        {
          title: "Retención de Clientes",
          query: "¿Qué clientes no han hecho una compra en los últimos 6 meses?",
          description: "Identificar clientes en riesgo de abandono",
          tags: ["Clientes", "Retención"]
        },
        {
          title: "Clientes Nuevos",
          query: "¿Cuántos clientes nuevos adquirimos este mes?",
          description: "Rastrear métricas de adquisición de clientes",
          tags: ["Clientes", "Crecimiento"]
        }
      ]
    },
    {
      category: "Análisis de Ventas",
      icon: TrendingUp,
      color: "bg-purple-100 text-purple-600",
      examples: [
        {
          title: "Tendencias de Ventas",
          query: "Muéstrame las tendencias de ventas mensuales del último año",
          description: "Analizar el rendimiento de ventas a lo largo del tiempo",
          tags: ["Ventas", "Tendencias"]
        },
        {
          title: "Rendimiento de Productos",
          query: "¿Cuáles son nuestros productos más vendidos este trimestre?",
          description: "Identificar productos de mejor rendimiento",
          tags: ["Productos", "Ventas"]
        },
        {
          title: "Ingresos por Región",
          query: "Compara los ingresos por región para este año",
          description: "Análisis de ventas geográfico",
          tags: ["Ingresos", "Geografía"]
        }
      ]
    },
    {
      category: "Gestión de Inventario",
      icon: Settings,
      color: "bg-orange-100 text-orange-600",
      examples: [
        {
          title: "Alerta de Stock Bajo",
          query: "Muéstrame productos con menos de 10 unidades en stock",
          description: "Identificar productos que necesitan reabastecimiento",
          tags: ["Inventario", "Stock"]
        },
        {
          title: "Valor de Inventario",
          query: "¿Cuál es el valor total de nuestro inventario actual?",
          description: "Calcular el valor total del inventario",
          tags: ["Inventario", "Valor"]
        },
        {
          title: "Productos de Rápido Movimiento",
          query: "¿Qué productos se venden más rápido?",
          description: "Identificar productos con alta rotación",
          tags: ["Inventario", "Rotación"]
        }
      ]
    }
  ];

  const faqItems = [
    {
      id: "connection",
      question: "How do I connect to my database?",
      answer: "Navigate to the Database Connection page and enter your database credentials. We support PostgreSQL, MySQL, SQL Server, Oracle, and SQLite. Make sure your database is accessible from the internet and you have the correct connection details including host, port, username, and password."
    },
    {
      id: "security",
      question: "Is my database information secure?",
      answer: "Yes! All connection details are encrypted and never stored permanently on our servers. Your database credentials are only kept in memory during your session and are automatically cleared when you log out or close your browser."
    },
    {
      id: "query-types",
      question: "What types of queries can I ask?",
      answer: "You can ask questions in natural language about your data. Try queries like 'Show me sales trends', 'List top customers', 'Find products with low inventory', or 'Compare performance by region'. The AI will convert your questions into SQL queries and provide meaningful results."
    },
    {
      id: "sql-access",
      question: "Can I see the generated SQL queries?",
      answer: "Absolutely! Click the 'View SQL' button next to any response to see the actual SQL query that was generated and executed. This helps you understand how your natural language question was translated into SQL and allows you to learn SQL patterns."
    },
    {
      id: "accuracy",
      question: "How accurate are the natural language interpretations?",
      answer: "Our AI is designed to understand complex database queries and provide accurate results. However, for complex queries, we recommend reviewing the generated SQL to ensure it matches your intent. You can always provide feedback to help improve accuracy."
    },
    {
      id: "permissions",
      question: "What database permissions do I need?",
      answer: "At minimum, your database user needs SELECT permissions on the tables you want to query. For schema exploration (viewing table structures), additional metadata permissions may be helpful. We recommend using a read-only user for security."
    },
    {
      id: "multiple-databases",
      question: "Can I connect to multiple databases?",
      answer: "Currently, you can connect to one database per session. To switch databases, disconnect from the current one and connect to another. We're working on multi-database support for future releases."
    },
    {
      id: "data-modification",
      question: "Can I modify data through natural language queries?",
      answer: "For security reasons, DataQuery Pro focuses on read-only operations (SELECT queries). INSERT, UPDATE, and DELETE operations are not supported through the natural language interface."
    }
  ];

  const connectionGuides = [
    {
      type: "PostgreSQL",
      defaultPort: 5432,
      icon: Database,
      tips: [
        "Default port is 5432",
        "Use 'localhost' for local databases",
        "Ensure pg_hba.conf allows connections",
        "Check firewall settings for remote connections"
      ]
    },
    {
      type: "MySQL",
      defaultPort: 3306,
      icon: Database,
      tips: [
        "Default port is 3306",
        "Ensure user has proper privileges",
        "Check bind-address in my.cnf",
        "Enable remote connections if needed"
      ]
    },
    {
      type: "SQL Server",
      defaultPort: 1433,
      icon: Database,
      tips: [
        "Default port is 1433",
        "Enable TCP/IP in SQL Server Configuration",
        "Configure Windows Firewall",
        "Use SQL Server Authentication"
      ]
    }
  ];

  const filteredFaqs = faqItems.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseExample = (query: string) => {
    // In a real implementation, this would navigate to chat with the query pre-filled
    console.log('Using example query:', query);
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ayuda y Ejemplos</h1>
        <p className="text-muted-foreground">
          Aprende cómo aprovechar al máximo DataQuery Pro con ejemplos y guías
        </p>
      </div>

      {/* Quick Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Buscar Temas de Ayuda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar temas de ayuda, ejemplos o preguntas frecuentes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Example Queries */}
      <div className="space-y-6">
        <div className="flex items-center">
          <Lightbulb className="h-5 w-5 mr-2" />
          <h2 className="text-2xl font-bold">Consultas de Ejemplo</h2>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          {exampleQueries.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${category.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {category.category}
                  </CardTitle>
                  <CardDescription>
                    Consultas comunes para {category.category.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {category.examples.map((example, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium mb-2">{example.title}</h4>
                            <p className="text-sm text-primary mb-2 font-mono bg-primary/5 px-2 py-1 rounded">
                              "{example.query}"
                            </p>
                            <p className="text-sm text-muted-foreground mb-3">
                              {example.description}
                            </p>
                            <div className="flex items-center space-x-2">
                              {example.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUseExample(example.query)}
                            className="ml-4"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Probar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Database Connection Guide */}
      <div className="space-y-6">
        <div className="flex items-center">
          <Database className="h-5 w-5 mr-2" />
          <h2 className="text-2xl font-bold">Database Connection Guide</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {connectionGuides.map((guide) => (
            <Card key={guide.type}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <guide.icon className="h-5 w-5 mr-2" />
                  {guide.type}
                </CardTitle>
                <CardDescription>
                  Default port: {guide.defaultPort}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {guide.tips.map((tip, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Data Security</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• All connections are encrypted with TLS/SSL</li>
                <li>• Database credentials are never stored permanently</li>
                <li>• Session data is cleared when you log out</li>
                <li>• No data is transmitted to third parties</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Best Practices</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Use read-only database users when possible</li>
                <li>• Regularly rotate database passwords</li>
                <li>• Monitor database access logs</li>
                <li>• Use VPN for additional security</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <div className="space-y-6">
        <div className="flex items-center">
          <HelpCircle className="h-5 w-5 mr-2" />
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {filteredFaqs.map((faq) => (
            <Collapsible
              key={faq.id}
              open={openFaq === faq.id}
              onOpenChange={(isOpen) => setOpenFaq(isOpen ? faq.id : null)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{faq.question}</CardTitle>
                      {openFaq === faq.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>

        {filteredFaqs.length === 0 && searchQuery && (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or browse the examples above
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Getting Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Still Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Documentation</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Visit our comprehensive documentation for detailed guides and API references.
              </p>
              <Button variant="outline" className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
            </div>
            <div>
              <h4 className="font-medium mb-2">Contact Support</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Get in touch with our support team for personalized assistance.
              </p>
              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
