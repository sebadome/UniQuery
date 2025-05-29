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
      question: "¿Cómo me conecto a mi base de datos?",
      answer: "Navega a la página de Conexión de Base de Datos e ingresa las credenciales de tu base de datos. Soportamos PostgreSQL, MySQL, SQL Server, Oracle y SQLite. Asegúrate de que tu base de datos sea accesible desde internet y que tengas los detalles de conexión correctos incluyendo host, puerto, nombre de usuario y contraseña."
    },
    {
      id: "security",
      question: "¿Está segura la información de mi base de datos?",
      answer: "¡Sí! Todos los detalles de conexión están encriptados y nunca se almacenan permanentemente en nuestros servidores. Las credenciales de tu base de datos solo se mantienen en memoria durante tu sesión y se eliminan automáticamente cuando cierras sesión o cierras tu navegador."
    },
    {
      id: "query-types",
      question: "¿Qué tipos de consultas puedo hacer?",
      answer: "Puedes hacer preguntas en lenguaje natural sobre tus datos. Prueba consultas como 'Muéstrame tendencias de ventas', 'Lista los mejores clientes', 'Encuentra productos con inventario bajo', o 'Compara rendimiento por región'. La IA convertirá tus preguntas en consultas SQL y proporcionará resultados significativos."
    },
    {
      id: "sql-access",
      question: "¿Puedo ver las consultas SQL generadas?",
      answer: "¡Por supuesto! Haz clic en el botón 'Ver SQL' junto a cualquier respuesta para ver la consulta SQL real que fue generada y ejecutada. Esto te ayuda a entender cómo tu pregunta en lenguaje natural fue traducida a SQL y te permite aprender patrones de SQL."
    },
    {
      id: "accuracy",
      question: "¿Qué tan precisas son las interpretaciones en lenguaje natural?",
      answer: "Nuestra IA está diseñada para entender consultas complejas de base de datos y proporcionar resultados precisos. Sin embargo, para consultas complejas, recomendamos revisar el SQL generado para asegurar que coincida con tu intención. Siempre puedes proporcionar comentarios para ayudar a mejorar la precisión."
    },
    {
      id: "permissions",
      question: "¿Qué permisos de base de datos necesito?",
      answer: "Como mínimo, tu usuario de base de datos necesita permisos SELECT en las tablas que quieres consultar. Para exploración de esquemas (ver estructuras de tablas), permisos adicionales de metadatos pueden ser útiles. Recomendamos usar un usuario de solo lectura por seguridad."
    },
    {
      id: "multiple-databases",
      question: "¿Puedo conectarme a múltiples bases de datos?",
      answer: "Actualmente, puedes conectarte a una base de datos por sesión. Para cambiar bases de datos, desconéctate de la actual y conéctate a otra. Estamos trabajando en soporte para múltiples bases de datos para futuras versiones."
    },
    {
      id: "data-modification",
      question: "¿Puedo modificar datos a través de consultas en lenguaje natural?",
      answer: "Por razones de seguridad, DataQuery Pro se enfoca en operaciones de solo lectura (consultas SELECT). Las operaciones INSERT, UPDATE y DELETE no están soportadas a través de la interfaz de lenguaje natural."
    }
  ];

  const connectionGuides = [
    {
      type: "PostgreSQL",
      defaultPort: 5432,
      icon: Database,
      tips: [
        "El puerto por defecto es 5432",
        "Usa 'localhost' para bases de datos locales",
        "Asegúrate de que pg_hba.conf permita conexiones",
        "Verifica la configuración del firewall para conexiones remotas"
      ]
    },
    {
      type: "MySQL",
      defaultPort: 3306,
      icon: Database,
      tips: [
        "El puerto por defecto es 3306",
        "Asegúrate de que el usuario tenga los privilegios adecuados",
        "Verifica bind-address en my.cnf",
        "Habilita conexiones remotas si es necesario"
      ]
    },
    {
      type: "SQL Server",
      defaultPort: 1433,
      icon: Database,
      tips: [
        "El puerto por defecto es 1433",
        "Habilita TCP/IP en Configuración de SQL Server",
        "Configura el Firewall de Windows",
        "Usa Autenticación de SQL Server"
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
          <h2 className="text-2xl font-bold">Guía de Conexión a Base de Datos</h2>
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
                  Puerto por defecto: {guide.defaultPort}
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
            Seguridad y Privacidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Seguridad de Datos</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Todas las conexiones están encriptadas con TLS/SSL</li>
                <li>• Las credenciales de base de datos nunca se almacenan permanentemente</li>
                <li>• Los datos de sesión se eliminan al cerrar sesión</li>
                <li>• No se transmiten datos a terceros</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Mejores Prácticas</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Usa usuarios de base de datos de solo lectura cuando sea posible</li>
                <li>• Rota regularmente las contraseñas de base de datos</li>
                <li>• Monitorea los registros de acceso a la base de datos</li>
                <li>• Usa VPN para seguridad adicional</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <div className="space-y-6">
        <div className="flex items-center">
          <HelpCircle className="h-5 w-5 mr-2" />
          <h2 className="text-2xl font-bold">Preguntas Frecuentes</h2>
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
              <h3 className="text-lg font-semibold mb-2">No se encontraron resultados</h3>
              <p className="text-muted-foreground">
                Intenta ajustar tus términos de búsqueda o navega por los ejemplos de arriba
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
            ¿Aún Necesitas Ayuda?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Documentación</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Visita nuestra documentación completa para guías detalladas y referencias de API.
              </p>
              <Button variant="outline" className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                Ver Documentación
              </Button>
            </div>
            <div>
              <h4 className="font-medium mb-2">Contactar Soporte</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Ponte en contacto con nuestro equipo de soporte para asistencia personalizada.
              </p>
              <Button variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contactar Soporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
