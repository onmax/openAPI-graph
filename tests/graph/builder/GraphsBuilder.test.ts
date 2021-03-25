import { OpenAPIGraphInterface, RefEdgeInterface, RefType } from 'openapi-graph-types';
import { OpenAPIGraphsBuilder } from '../../../src/graph';
import { RefEdge } from '../../../src/graph/edges';
import { SchemaNode } from '../../../src/graph/nodes/SchemaNode';
import { fetcher } from '../../../src/openapi/fetcher';

test('Creates a graph from the petstore specification', async () => {
    const petstoreApis = await fetcher("tests/resources/petstore");
    const petstoreBuilder = new OpenAPIGraphsBuilder(petstoreApis);
    expect(petstoreBuilder.graphs).toHaveLength(1);
    expect(petstoreBuilder.graphs[0]).toMatchSnapshot({
        path: expect.stringContaining('tests/resources/petstore'),
        edges: expect.any(Object),
        nodes: expect.any(Object),
    });
    const graph = petstoreBuilder.graphs[0]
    const schemasNames: string[] = Object.values(graph.getSchemaNodes()).map(n => n.name).sort();
    const expected = ["Pet", "Pets", "Error", "SchemaNotBeingUsed", "inline-schema-1"].sort()
    expect(schemasNames).toEqual(expected)

    const refSchemas: RefEdgeInterface[] = Object.values(graph.getSchemaRefEdges());
    const expectedSchemas = ['Pets', 'Error', 'Pet'].sort()
    expect(refSchemas.map(n => n.ref).sort()).toStrictEqual(expectedSchemas.map(s => `#/components/schemas/${s}`))
    expect(refSchemas.map(n => n.tokenName).sort()).toStrictEqual(expectedSchemas)
});

test('Creates a graph from the social-network specification', async () => {
    const socialNetworkApis = await fetcher("tests/resources/social-network");
    const socialNetworkBuilder = new OpenAPIGraphsBuilder(socialNetworkApis);
    expect(socialNetworkBuilder.graphs).toHaveLength(3);

    const socialNetworkGraph = socialNetworkBuilder.graphs.find(g => g.path.endsWith('social-network.yaml')) as OpenAPIGraphInterface
    const socialNetworkUsersGraph = socialNetworkBuilder.graphs.find(g => g.path.endsWith('users.yaml')) as OpenAPIGraphInterface
    const socialNetworkPostsGraph = socialNetworkBuilder.graphs.find(g => g.path.endsWith('posts.yaml')) as OpenAPIGraphInterface

    expect(socialNetworkGraph).toMatchSnapshot({
        path: expect.stringContaining('tests/resources/social-network/social-network.yaml'),
    });
    expect(socialNetworkUsersGraph).toMatchSnapshot({
        path: expect.stringContaining('tests/resources/social-network/users/users.yaml'),
        nodes: {
            schemas: {
                "inline-schema-1": {
                    name: 'inline-schema-1',
                    content: {
                        format: 'array',
                        items: { $ref: expect.any(String) }
                    }
                }
            }
        }
    });
    expect(socialNetworkPostsGraph).toMatchSnapshot({
        path: expect.stringContaining('tests/resources/social-network/posts/posts.yaml'),
        nodes: {
            schemas: {
                "inline-schema-1": {
                    name: 'inline-schema-1',
                    content: {
                        format: 'array',
                        items: { $ref: expect.any(String) }
                    }
                }
            }
        }
    });

    expect(Object.values(socialNetworkGraph.edges.ref.schemaRef)).toHaveLength(4);
    expect(Object.values(socialNetworkUsersGraph.edges.ref.schemaRef)).toHaveLength(2);
    expect(Object.values(socialNetworkPostsGraph.edges.ref.schemaRef)).toHaveLength(1);

    // Test social-network.yaml
    const expected = ["Username", "Name", "Email", "User", "Post"].sort()
    const schemasSocialNetworkNames: string[] = Object.values(socialNetworkGraph.getSchemaNodes()).map(n => n.name).sort();
    expect(schemasSocialNetworkNames).toEqual(expected)
    const refSocialNetworkNames: RefEdgeInterface[] = Object.values(socialNetworkGraph.getSchemaRefEdges());
    const expectedSchemas = ['Username', 'Name', 'Email', 'User'].sort()
    expect(refSocialNetworkNames.map(n => n.ref).sort()).toStrictEqual(expectedSchemas.map(s => `#/components/schemas/${s}`))
    expect(refSocialNetworkNames.map(n => n.tokenName).sort()).toStrictEqual(expectedSchemas)

    // Test users.yaml
    const schemasUsersNames: string[] = Object.values(socialNetworkUsersGraph.getSchemaNodes()).map(n => n.name).sort();
    expect(schemasUsersNames).toStrictEqual(['inline-schema-1'])
    Object.values(socialNetworkUsersGraph.getSchemaRefEdges()).map(edge => {
        expect(edge.type).toStrictEqual(RefType.Remote)
        expect(edge.child).toBeInstanceOf(SchemaNode)
    })
    expect(Object.values(socialNetworkUsersGraph.getSchemaRefEdges()).map(edge => edge.tokenName).sort()).toStrictEqual(['User', 'Username'].sort())

    // Test posts.yaml
    const schemasPostsNames: string[] = Object.values(socialNetworkPostsGraph.getSchemaNodes()).map(n => n.name).sort();
    expect(schemasPostsNames).toStrictEqual(['inline-schema-1'])
    Object.values(socialNetworkPostsGraph.getSchemaRefEdges()).map(edge => {
        expect(edge).toBeInstanceOf(RefEdge)
        expect(edge.type).toStrictEqual(RefType.Remote)
        expect(edge.child).toBeInstanceOf(SchemaNode)
    })
    expect(Object.values(socialNetworkPostsGraph.getSchemaRefEdges()).map(edge => edge.tokenName).sort()).toStrictEqual(['Post'])
});